#include "jscjs.h"

/* TODO:
create embind `Context` class (with destroy, send, etc)
send should accept inf args
*/

using namespace JSC;
using namespace std;

typedef vector<char> BytecodeVector;

class SourceProviderBytecode : public StringSourceProvider {
public:
    static Ref<SourceProviderBytecode> create(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin){
        return adoptRef(*new SourceProviderBytecode(move(bytecode), sourceOrigin));
	}

	~SourceProviderBytecode() {}

    const CachedBytecode* cachedBytecode() const override {
        return &m_cachedBytecode;
    }

    bool isBytecodeOnly() override {
        return true;
    }
private:
    SourceProviderBytecode(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin) : StringSourceProvider(String(), sourceOrigin, URL(), TextPosition(), SourceProviderSourceType::Program), m_bytecode(bytecode){
		ASSERT(!m_bytecode.empty());
		m_cachedBytecode = CachedBytecode{ m_bytecode.data(), m_bytecode.size() };
	}
	
	BytecodeVector m_bytecode;
	CachedBytecode m_cachedBytecode;
};

static inline SourceCode jscSourceForDump(const String& source, const SourceOrigin& sourceOrigin){
	return SourceCode(StringSourceProvider::create(source, sourceOrigin, URL(), TextPosition(), SourceProviderSourceType::Program), 1, 1);
}

static inline SourceCode jscSourceFromBytecode(BytecodeVector&& bytecode, const SourceOrigin& sourceOrigin) {
	return SourceCode(SourceProviderBytecode::create(move(bytecode), sourceOrigin), 1, 1);
}

bool dumpBytecodeFromSource(VM& vm, String& source, const SourceOrigin& sourceOrigin, BytecodeVector& dumpedBytecode, String& errMsg){
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
	for (int i = 0; i < bytecodeSize; i++)dumpedBytecode.push_back(data[i]);
	return true;
}

EM_JS(void, emit_event, (const char* string), {
	JSC.eventp.emit(...JSON.parse(UTF8ToString(string)));
});

static const char s_hexTable[] = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };

std::string bytecodeToStr(BytecodeVector& bytecode) {
	std::string str;
    for (auto i : bytecode) {
        str.push_back(s_hexTable[(i & 0xF0) >> 4]);
        str.push_back(s_hexTable[(i & 0x0F)]);
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
        if(!ok)return false;
    }

    return true;
}

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

bool checkSyntax(VM& vm, String& sourceStr, SourceOrigin& sourceOrigin, String& errMsg) {
	ParserError error;
	checkSyntax(vm, makeSource(sourceStr, sourceOrigin), error);
	if (error.isValid()) {
		errMsg = error.message() + ":" + String::number(error.line());
		return false;
	}
	return true;
};


int cids = 0;

class EMJSCJS {
public:
	int id;
	JSGlobalObject* global;
	JSContextRef ctx;
	EMJSCJS() {
		init();

		id = cids++;

		VM& vm = VM::create(LargeHeap).leakRef();
		JSLockHolder locker(vm);
		global = JSGlobalObject::create(vm, JSGlobalObject::createStructure(vm, jsNull()));

		ctx = toRef(global->globalExec());

		expose_emit();
	}
	void expose_emit() {
		JSStringRef name = JSStringCreateWithUTF8CString("jsc_emit");
		JSObjectRef func = JSObjectMakeFunctionWithCallback(ctx, name, emit_func);
		JSObjectSetProperty(ctx, toRef(global), name, func, kJSPropertyAttributeNone, nullptr);
		JSStringRelease(name);
	}
	void init() {
		JSC::Options::enableRestrictedOptions(true);
		JSC::Options::initialize();
		JSC::Options::ensureOptionsAreCoherent();
		WTF::initializeMainThread();
		JSC::initializeThreading();
	}
	std::string eval(std::string src) {
		VM& vm = global->vm();
		JSLockHolder locker(vm);
		auto scope = DECLARE_CATCH_SCOPE(vm);
		SourceOrigin sourceOrigin("interpreter");

		// check syntax
		String source = String::fromUTF8(src.c_str());
		String errMsg;
		if (!checkSyntax(vm, source, sourceOrigin, errMsg))return errMsg.utf8().data();

		// eval
		String ret_str;
		NakedPtr<Exception> evaluationException;
		JSValue returnValue = evaluate(global->globalExec(), makeSource(source, sourceOrigin), JSValue(), evaluationException);

		if (evaluationException) {
			printf("Module.eval exception:\n%s\n", evaluationException->value().toWTFString(global->globalExec()).utf8().data());
		}
		else ret_str = String(returnValue.toWTFString(global->globalExec()));

		scope.clearException();
		static CString ret_utf8;
		ret_utf8 = ret_str.utf8();
		return ret_utf8.data();
	}
	std::string eval_bytecode(std::string src) {
		VM& vm = global->vm();
		JSLockHolder locker(vm);
		auto scope = DECLARE_CATCH_SCOPE(vm);
		SourceOrigin sourceOrigin("interpreter");

		// convert
		BytecodeVector bytecode;
		String source(src.c_str());

		if (!strToBytecode(source, bytecode)) {
			return "error: Invalid bytecode.";
		}

		// eval
		String ret_str;
		NakedPtr<Exception> evaluationException;
		// todo: call context's jsc brige's ipc handle create
		JSValue returnValue = evaluate(global->globalExec(), jscSourceFromBytecode(move(bytecode), sourceOrigin), JSValue(), evaluationException);
		if (evaluationException)ret_str = String("Exception: ") + evaluationException->value().toWTFString(global->globalExec());
		else ret_str = String(returnValue.toWTFString(global->globalExec()));

		scope.clearException();
		static CString ret;
		ret = ret_str.utf8();
		return ret.data();
	}
	std::string compile_bytecode(std::string input) {
		VM& vm = global->vm();
		JSLockHolder locker(vm);
		SourceOrigin sourceOrigin("interpreter");
		String errMsg;

		// check syntax
		String source = String::fromUTF8(input.c_str());
		if (!checkSyntax(vm, source, sourceOrigin, errMsg))return errMsg.utf8().data();

		// compile
		BytecodeVector bytecode;
		if (!dumpBytecodeFromSource(vm, source, sourceOrigin, bytecode, errMsg))return errMsg.utf8().data();

		return bytecodeToStr(bytecode);
	}
	~EMJSCJS() {
		// JSContextDestroy(ctx);

		JSGlobalContextRelease(JSContextGetGlobalContext(ctx));
	}
};

EMSCRIPTEN_BINDINGS() {
	emscripten::class_<EMJSCJS>("JSCJS")
		.constructor<>()
		.function("eval", &EMJSCJS::eval)
		.function("eval_bytecode", &EMJSCJS::eval_bytecode)
		.function("compile_bytecode", &EMJSCJS::compile_bytecode)
		.function("destroy", &EMJSCJS::destroy)
		.property("id", &EMJSCJS::id)
		;
}