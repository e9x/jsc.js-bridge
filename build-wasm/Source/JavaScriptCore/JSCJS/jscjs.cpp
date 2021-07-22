#include "jscjs.h"

using namespace JSC;
using namespace emscripten;

typedef std::vector<char> BytecodeVector;

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

static const char hex[] = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };

std::string bytecodeToStr(BytecodeVector& bytecode) {
	std::string str;
    for (auto i : bytecode) {
        str.push_back(hex[(i & 0xF0) >> 4]);
        str.push_back(hex[(i & 0x0F)]);
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

bool checkSyntax(VM& vm, String& sourceStr, SourceOrigin& sourceOrigin, String& errMsg) {
	ParserError error;
	checkSyntax(vm, makeSource(sourceStr, sourceOrigin), error);
	if (error.isValid()) {
		errMsg = error.message() + ":" + String::number(error.line());
		return false;
	}
	return true;
};

JSValueRef jsc_send(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception);

JSValueRef jsc_log(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception) {
	JSStringRef jsons = JSValueCreateJSONString(ctx, JSObjectMakeArray(ctx, argumentCount, arguments, NULL), 0, NULL);

	size_t length = JSStringGetMaximumUTF8CStringSize(jsons);

	char string[length];

	JSStringGetUTF8CString(jsons, string, length);
	
	JSStringRelease(jsons);

	printf("%s\n", string);

	return JSValueMakeUndefined(ctx);
}

int cids = 0;

class EMJSCJS {
public:
	int id;
	JSGlobalObject* global;
	JSContextRef ctx;
	JSObjectRef JSC;
	JSObjectRef on_event;
	EMJSCJS() {
		init();
		
		id = cids++;
		
		VM& vm = VM::create(LargeHeap).leakRef();
		JSLockHolder locker(vm);
		global = JSGlobalObject::create(vm, JSGlobalObject::createStructure(vm, jsNull()));

		ctx = toRef(global->globalExec());

		JSC = JSObjectMake(ctx, NULL, NULL);
		
		JSObjectSetPrivate(JSC, (void*)id);

		// jscLINK
		/*JSStringRef jlr = JSStringCreateWithUTF8CString("jscLINK");
		JSObjectSetProperty(ctx, toRef(global), jlr, JSC, kJSPropertyAttributeNone, nullptr);
		JSStringRelease(jlr);*/
		
		// jscLINK.id
		JSStringRef idr = JSStringCreateWithUTF8CString("id");
		JSObjectSetProperty(ctx, JSC, idr, JSValueMakeNumber(ctx, id), kJSPropertyAttributeNone, nullptr);
		JSStringRelease(idr);
		
		// jscLINK.log
		JSStringRef lor = JSStringCreateWithUTF8CString("log");
		JSObjectSetProperty(ctx, JSC, lor, JSObjectMakeFunctionWithCallback(ctx, NULL, jsc_log), kJSPropertyAttributeNone, nullptr);
		JSStringRelease(lor);
		
		// jscLINK.send
		JSStringRef ser = JSStringCreateWithUTF8CString("send");
		JSObjectSetProperty(ctx, JSC, ser, JSObjectMakeFunctionWithCallback(ctx, NULL, jsc_send), kJSPropertyAttributeNone, nullptr);
		JSStringRelease(ser);
	}
	static void init() {
		static bool did_init = false;

		if (did_init)return;

		did_init = true;

		JSC::Options::enableRestrictedOptions(true);
		JSC::Options::initialize();
		JSC::Options::ensureOptionsAreCoherent();
		WTF::initializeMainThread();
		JSC::initializeThreading();
	}
	JSObjectRef jsc_func(const char* property) {
		JSStringRef prop = JSStringCreateWithUTF8CString(property);
		JSValueRef func = JSObjectGetProperty(ctx, JSC, prop, NULL);
		JSStringRelease(prop);

		if (!JSValueIsObject(ctx, func))throw printf("jscLINK.%s is not a property.\n", property);

		return JSValueToObject(ctx, func, NULL);
	}
	std::string send(int event, std::string data) {
		JSObjectRef json = JSValueToObject(ctx, JSValueToObject(ctx, JSValueMakeFromJSONString(ctx, JSStringCreateWithUTF8CString(data.c_str())), NULL), NULL);

		/*
		json is a js object array, not an array of jsvalues
		which is why it cant be used directly as an argument
		*/

		JSStringRef length_str = JSStringCreateWithUTF8CString("length");
		size_t json_len = JSValueToNumber(ctx, JSObjectGetProperty(ctx, json, length_str, NULL), NULL);
		JSStringRelease(length_str);

		JSValueRef args[1 + json_len];
		args[0] = JSValueMakeNumber(ctx, event);
		
		for (int index = 0; index < json_len; index++)args[index + 1] = JSObjectGetPropertyAtIndex(ctx, json, index, NULL);
		
		size_t args_len = sizeof(args) / sizeof(JSValueRef*);

		// printf("sending event %d to context and json %s\n", event, data.c_str());
		
		JSValueRef exception;
		
		JSValueRef result = JSObjectCallAsFunction(ctx, jsc_func("event"), JSC, args_len, args, &exception);
		
		handle_exception(exception);
		
		if (JSValueIsNull(ctx, result))return "";

		JSStringRef jsons = JSValueCreateJSONString(ctx, result, 0, NULL);
		
		char string[JSStringGetMaximumUTF8CStringSize(jsons)];

		JSStringGetUTF8CString(jsons, string, sizeof(string));

		JSStringRelease(jsons);

		return string;
	}
	void handle_exception(JSValueRef exception){
		if(!JSValueIsNull(ctx, exception)){
			JSStringRef jsstring = JSValueToStringCopy(ctx, exception, NULL);
			size_t size = JSStringGetMaximumUTF8CStringSize(jsstring);
			
			char string[size];
			
			JSStringGetUTF8CString(jsstring, string, size);
			
			JSStringRelease(jsstring);
			
			throw printf("ERROR:\n%s\n", string);
		}
	}
	void main(std::string client_js){
		JSStringRef params[] = { JSStringCreateWithUTF8CString("$") };
		size_t param_size = sizeof(params) / sizeof(JSStringRef*);
		
		JSStringRef body = JSStringCreateWithUTF8CString(client_js.c_str());
		
		JSStringRef name = JSStringCreateWithUTF8CString("JSCMain");
		
		JSValueRef exception;
		
		JSObjectRef func = JSObjectMakeFunction(ctx, name, param_size, params, body, name, 1, &exception);
		
		handle_exception(exception);
		
		JSStringRelease(body);
		JSStringRelease(name);
		
		for(int index = 0; index < param_size; index++)JSStringRelease(params[index]);
		
		JSValueRef args[] = { JSC };
		
		JSValueRef result = JSObjectCallAsFunction(ctx, func, JSC, sizeof(args) / sizeof(JSValueRef*), args, &exception);
		
		handle_exception(exception);
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

JSValueRef jsc_send(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception) {
	int event = JSValueToNumber(ctx, arguments[0], exception);
	const char* data;

	if(argumentCount == 1) {
		data = "[]";
	}else{
		size_t jsize = argumentCount - 1;
		JSValueRef jdata[jsize];
		for (int index = 0; index < jsize; index++) {
			jdata[index] = arguments[index + 1];
		}

		JSStringRef jsons = JSValueCreateJSONString(ctx, JSObjectMakeArray(ctx, jsize, jdata, exception), 0, exception);

		char string[JSStringGetMaximumUTF8CStringSize(jsons)];

		JSStringGetUTF8CString(jsons, string, sizeof(string));
		JSStringRelease(jsons);
		
		data = string;
	}

	JSStringRef prop = JSStringCreateWithUTF8CString("id");
	int ctx_id = JSValueToNumber(ctx, JSObjectGetProperty(ctx, thisObject, prop, exception), exception);
	JSStringRelease(prop);
	
	// printf("EVENT: %d\nSTRING: %s\nCTX: %d\nARGUMENT COUNT: %zu\n", event, data, ctx_id, argumentCount);

	// emit_event(ctx_id, event, data);
	
	auto result = val::module_property("eventp").call<std::string>("emit_gjson", ctx_id, event, std::string(data));
	
	// printf("str %s\n", result.c_str());
	
	// Module.eventp.emit(ctx, event, ...JSON.parse(UTF8ToString(string)));
	
	return JSValueMakeString(ctx, JSStringCreateWithUTF8CString(result.c_str()));
}

EMSCRIPTEN_BINDINGS() {
	class_<EMJSCJS>("JSCJS")
		.constructor<>()
		.function("main", &EMJSCJS::main)
		.function("send_json", &EMJSCJS::send)
		.function("eval_bytecode", &EMJSCJS::eval_bytecode)
		.function("compile_bytecode", &EMJSCJS::compile_bytecode)
		.property("id", &EMJSCJS::id)
		;
}