#include "jscjs.h"

/* TODO:
Remove ref usage
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
	bool is_ctx = false;
	EMJSCJS() {
		init();

		is_ctx = true;

		id = cids++;

		VM& vm = VM::create(LargeHeap).leakRef();
		JSLockHolder locker(vm);
		global = JSGlobalObject::create(vm, JSGlobalObject::createStructure(vm, jsNull()));

		ctx = toRef(global->globalExec());

		JSC = JSObjectMake(ctx, NULL, NULL);
		
		JSObjectSetPrivate(JSC, (void*)id);

		expose_jsc();
		expose_send();
	}
	bool is_context() {
		return is_ctx == true;
	}
	void expose_jsc() {
		JSStringRef name = JSStringCreateWithUTF8CString("jscLINK");
		JSObjectSetProperty(ctx, toRef(global), name, JSC, kJSPropertyAttributeNone, nullptr);
		JSStringRelease(name);
		expose_id();
		expose_log();
	}
	void expose_id() {
		JSStringRef name = JSStringCreateWithUTF8CString("id");
		JSObjectSetProperty(ctx, JSC, name, JSValueMakeNumber(ctx, id), kJSPropertyAttributeNone, nullptr);
		JSStringRelease(name);
	}
	void expose_log() {
		JSStringRef name = JSStringCreateWithUTF8CString("log");
		JSObjectRef func = JSObjectMakeFunctionWithCallback(ctx, name, jsc_log);
		JSObjectSetProperty(ctx, JSC, name, func, kJSPropertyAttributeNone, nullptr);
		JSStringRelease(name);
	}
	void expose_send() {
		JSStringRef name = JSStringCreateWithUTF8CString("send");
		JSObjectRef func = JSObjectMakeFunctionWithCallback(ctx, name, jsc_send);
		JSObjectSetProperty(ctx, JSC, name, func, kJSPropertyAttributeNone, nullptr);
		JSStringRelease(name);
	}
	JSObjectRef jsc_func(const char* property) {
		JSStringRef prop = JSStringCreateWithUTF8CString(property);
		JSValueRef func = JSObjectGetProperty(ctx, JSC, prop, NULL);
		JSStringRelease(prop);

		if (!JSValueIsObject(ctx, func))throw printf("jscLINK.%s is not a property.\n", property);

		return JSValueToObject(ctx, func, NULL);
	}
	void init() {
		JSC::Options::enableRestrictedOptions(true);
		JSC::Options::initialize();
		JSC::Options::ensureOptionsAreCoherent();
		WTF::initializeMainThread();
		JSC::initializeThreading();
	}
	std::string send_json(int event, std::string data) {
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

		JSValueRef result = JSObjectCallAsFunction(ctx, jsc_func("event"), JSC, args_len, args, NULL);

		if (JSValueIsNull(ctx, result))return "";

		JSStringRef jsons = JSValueCreateJSONString(ctx, result, 0, NULL);
		
		size_t length = JSStringGetMaximumUTF8CStringSize(jsons);

		char string[length];

		JSStringGetUTF8CString(jsons, string, length);

		JSStringRelease(jsons);
		
		return string;
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
		// String ret_str;
		NakedPtr<Exception> evaluationException;
		JSValue result = evaluate(global->globalExec(), makeSource(source, sourceOrigin), JSValue(), evaluationException);

		if (evaluationException) {
			printf("Module.eval exception:\n%s\n", evaluationException->value().toWTFString(global->globalExec()).utf8().data());

			scope.clearException();

			return "";
		}
		
		JSValueRef result_ref = toRef(global->globalExec(), result);

		if (JSValueIsNull(ctx, result_ref))return "";
			
		JSStringRef jsons = JSValueCreateJSONString(ctx, result_ref, 0, NULL);

		char string[JSStringGetMaximumUTF8CStringSize(jsons)];

		JSStringGetUTF8CString(jsons, string, sizeof(string));

		JSStringRelease(jsons);
			
		return string;
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

EM_JS(void, emit_event, (int ctx, int event, const char* string), {
	Module.eventp.emit(ctx, event, ...JSON.parse(UTF8ToString(string)));
});

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

	emit_event(ctx_id, event, data);

	return JSValueMakeUndefined(ctx);
}

EMSCRIPTEN_BINDINGS() {
	emscripten::class_<EMJSCJS>("JSCJS")
		.constructor<>()
		.function("send_json", &EMJSCJS::send_json)
		.function("eval", &EMJSCJS::eval)
		.function("eval_bytecode", &EMJSCJS::eval_bytecode)
		.function("compile_bytecode", &EMJSCJS::compile_bytecode)
		.property("id", &EMJSCJS::id)
		;
}