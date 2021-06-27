// billming
#include "config.h"

#include <iostream>
#include <vector>
#include "ArrayBuffer.h"
#include "ArrayPrototype.h"
#include "BuiltinNames.h"
#include "ButterflyInlines.h"
#include "CatchScope.h"
#include "CodeBlock.h"
#include "CodeCache.h"
#include "Completion.h"
#include "ConfigFile.h"
#include "Disassembler.h"
#include "Exception.h"
#include "ExceptionHelpers.h"
#include "HeapProfiler.h"
#include "HeapSnapshotBuilder.h"
#include "InitializeThreading.h"
#include "Interpreter.h"
#include "JIT.h"
#include "JSArray.h"
#include "JSArrayBuffer.h"
#include "JSBigInt.h"
#include "JSCInlines.h"
#include "JSFunction.h"
#include "JSInternalPromise.h"
#include "JSInternalPromiseDeferred.h"
#include "JSLock.h"
#include "JSModuleLoader.h"
#include "JSNativeStdFunction.h"
#include "JSONObject.h"
#include "JSSourceCode.h"
#include "JSString.h"
#include "JSTypedArrays.h"
#include "JSWebAssemblyInstance.h"
#include "JSWebAssemblyMemory.h"
#include "LLIntThunks.h"
#include "ObjectConstructor.h"
#include "ParserError.h"
#include "ProfilerDatabase.h"
#include "PromiseDeferredTimer.h"
#include "ProtoCallFrame.h"
#include "ReleaseHeapAccessScope.h"
#include "SamplingProfiler.h"
#include "SourceProvider.h"
#include "StackVisitor.h"
#include "StructureInlines.h"
#include "StructureRareDataInlines.h"
#include "SuperSampler.h"
#include "TestRunnerUtils.h"
#include "TypedArrayInlines.h"
#include <locale.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wtf/Box.h>
#include <wtf/CommaPrinter.h>
#include <wtf/MainThread.h>
#include <wtf/MemoryPressureHandler.h>
#include <wtf/MonotonicTime.h>
#include <wtf/NeverDestroyed.h>
#include <wtf/Scope.h>
#include <wtf/StringPrintStream.h>
#include <wtf/URL.h>
#include <wtf/WallTime.h>
#include <wtf/text/StringBuilder.h>
#include <wtf/text/StringConcatenateNumbers.h>

#include "APICast.h"
#include "DateConstructor.h"
#include "ErrorConstructor.h"
#include "FunctionConstructor.h"
#include "Identifier.h"
#include "InitializeThreading.h"
#include "JSArray.h"
#include "JSCallbackConstructor.h"
#include "JSCallbackFunction.h"
#include "JSCallbackObject.h"
#include "JSClassRef.h"
#include "JSFunction.h"
#include "JSGlobalObject.h"
#include "JSObject.h"
#include "JSRetainPtr.h"
#include "JSString.h"
#include "JSValueRef.h"
#include "ObjectPrototype.h"
#include "PropertyNameArray.h"
#include "RegExpConstructor.h"

#include "JSContext.h"
#include "JSContextRef.h"
#include "JSObjectRef.h"
#include "JSObject.h"
#include "JSValueRef.h"
#include "JSValue.h"
#include "JSStringRef.h"
#include "JSString.h"

#include "Error.h"

#include <emscripten/emscripten.h>

using namespace JSC;
using namespace std;

using BytecodeVector = vector<char>;

class SourceProviderBytecode : public StringSourceProvider {
public:
    static Ref<SourceProviderBytecode> create(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin)
    {
        return adoptRef(*new SourceProviderBytecode(move(bytecode), sourceOrigin));
    }

    ~SourceProviderBytecode()
    {
    }

    const CachedBytecode* cachedBytecode() const override
    {
        return &m_cachedBytecode;
    }

    bool isBytecodeOnly() override
    {
        return true;
    }

private:
    SourceProviderBytecode(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin)
        : StringSourceProvider(String(), sourceOrigin, URL(), TextPosition(), SourceProviderSourceType::Program)
        , m_bytecode(bytecode)
    {
        ASSERT(!m_bytecode.empty());
        m_cachedBytecode = CachedBytecode{ m_bytecode.data(), m_bytecode.size() };
    }

    BytecodeVector m_bytecode;
    CachedBytecode m_cachedBytecode;
};

static inline SourceCode jscSourceForDump(const String& source, const SourceOrigin& sourceOrigin)
{
    return SourceCode(StringSourceProvider::create(source, sourceOrigin, URL(), TextPosition(), SourceProviderSourceType::Program), 1, 1);
}

static inline SourceCode jscSourceFromBytecode(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin)
{
    return SourceCode(SourceProviderBytecode::create(move(bytecode), sourceOrigin), 1, 1);
}

bool dumpBytecodeFromSource(VM& vm, String& source, const SourceOrigin& sourceOrigin, BytecodeVector& dumpedBytecode, String& errMsg)
{
    // Generate bytecode
    ParserError error;
    auto cachedBytecode = generateProgramBytecode(vm, jscSourceForDump(source, sourceOrigin), error);
    if (cachedBytecode.data() == nullptr) {
        errMsg = error.message() + ":" + String::number(error.line());
        return false;
    }
    const char* data = static_cast<const char*>(cachedBytecode.data());
    auto bytecodeSize = cachedBytecode.size();
    ASSERT(bytecodeSize);
    ASSERT(dumpedBytecode.empty());
    dumpedBytecode.reserve(bytecodeSize);
    for (int i = 0; i < bytecodeSize; i++) {
        dumpedBytecode.push_back(data[i]);
    }
    return true;
}

static const char s_hexTable[] = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };
String bytecodeToStr(BytecodeVector& bytecode) {
    String str;
    for (auto i : bytecode) {
        str.append(s_hexTable[(i & 0xF0) >> 4]);
        str.append(s_hexTable[(i & 0x0F)]);
    }
    return str;
}

bool strToBytecode(const String& bytecodeStr, BytecodeVector& bytecode) {
    if (bytecodeStr.length() % 2 != 0) {
        return false;
    }
    for (int i = 0; i < bytecodeStr.length(); i += 2) {
        bool ok = false;
        bytecode.push_back((char)(bytecodeStr.substring(i, 2).toIntStrict(&ok, 16)));
        if (!ok)
            return false;
    }
    return true;
}

void jsc_init() {
    static bool initialized = false;
    if (initialized)
        return;
    JSC::Options::enableRestrictedOptions(true);
    JSC::Options::initialize();
    JSC::Options::ensureOptionsAreCoherent();
    WTF::initializeMainThread();
    JSC::initializeThreading();

    initialized = true;
}

EM_JS(void, emit_event, (const char* string), {
	JSC.ipc.emit(...JSON.parse(UTF8ToString(string)));
});

JSValueRef emit_func(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception){
	JSValueRef first_arg = arguments[0];
	
	JSStringRef js_string = JSValueToStringCopy(ctx, first_arg, exception);
	
	size_t length = JSStringGetMaximumUTF8CStringSize(js_string);
	
	char string[length];
	
	JSStringGetUTF8CString(js_string, string, length);
	
	emit_event(string);
	
	JSStringRelease(js_string);
	
	return JSValueMakeUndefined(ctx);
}

JSGlobalObject* jsc_global(){
    jsc_init();
    static VM& vm = VM::create(LargeHeap).leakRef();
    JSLockHolder locker(vm);
    static JSGlobalObject* globalObject = JSGlobalObject::create(vm, JSGlobalObject::createStructure(vm, jsNull()));
	
	JSContextRef ctx = toRef(globalObject->globalExec());
	
	// expose ipc
    JSStringRef name = JSStringCreateWithUTF8CString("jsc_emit");
    JSObjectRef func = JSObjectMakeFunctionWithCallback(ctx, name, emit_func);
    JSObjectSetProperty(ctx, toRef(globalObject), name, func, kJSPropertyAttributeNone, nullptr);
    JSStringRelease(name);
	
    return globalObject;
}

bool checkSyntax(VM& vm, String& sourceStr, SourceOrigin& sourceOrigin, String& errMsg) {
    ParserError error;
    checkSyntax(vm, makeSource(sourceStr, sourceOrigin), error);
    if (error.isValid()) {
        errMsg = error.message() + ":" + String::number(error.line());
        return false;
    }
    return true;
}

extern "C" {

const char* jsc_eval(const char* src) {
    static JSGlobalObject* globalObject = jsc_global();

    VM& vm = globalObject->vm();
    JSLockHolder locker(vm);
    auto scope = DECLARE_CATCH_SCOPE(vm);
    SourceOrigin sourceOrigin("interpreter");

    // check syntax
    String source = String::fromUTF8(src);
    String errMsg;
    if(!checkSyntax(vm, source, sourceOrigin, errMsg))return errMsg.utf8().data();
	
    // eval
	String ret_str;
    NakedPtr<Exception> evaluationException;
    JSValue returnValue = evaluate(globalObject->globalExec(), makeSource(source, sourceOrigin), JSValue(), evaluationException);
	
    if(evaluationException)ret_str = String("Exception: ") + evaluationException->value().toWTFString(globalObject->globalExec());
    else ret_str = String(returnValue.toWTFString(globalObject->globalExec()));

    scope.clearException();
    static CString ret_utf8;
    ret_utf8 = ret_str.utf8();
    return ret_utf8.data();
}

const char* jsc_compile(const char* src) {
    static JSGlobalObject* globalObject = jsc_global();

    VM& vm = globalObject->vm();
    JSLockHolder locker(vm);
    SourceOrigin sourceOrigin("interpreter");
    String errMsg;

    // check syntax
    String source = String::fromUTF8(src);
    if (!checkSyntax(vm, source, sourceOrigin, errMsg))return errMsg.utf8().data();
    
    // compile
    BytecodeVector bytecode;
    if (!dumpBytecodeFromSource(vm, source, sourceOrigin, bytecode, errMsg))return errMsg.utf8().data();
	
    auto bytecodeStr = bytecodeToStr(bytecode);
    static CString ret;
    ret = bytecodeStr.utf8();
    return ret.data();
}

const char* jsc_eval_bytecode(const char* src) {
    static JSGlobalObject* globalObject = jsc_global();

    VM& vm = globalObject->vm();
    JSLockHolder locker(vm);
    auto scope = DECLARE_CATCH_SCOPE(vm);
    SourceOrigin sourceOrigin("interpreter");

    // convert
    BytecodeVector bytecode;
    String source(src);
    if (!strToBytecode(source, bytecode)) {
        return "error: Invalid bytecode.";
    }

    // eval
    String ret_str;
    NakedPtr<Exception> evaluationException;
    JSValue returnValue = evaluate(globalObject->globalExec(), jscSourceFromBytecode(move(bytecode), sourceOrigin), JSValue(), evaluationException);
    if (evaluationException)
        ret_str = String("Exception: ") + evaluationException->value().toWTFString(globalObject->globalExec());
    else
        ret_str = String(returnValue.toWTFString(globalObject->globalExec()));

    scope.clearException();
    static CString ret;
    ret = ret_str.utf8();
    return ret.data();
}

} // extern "C"