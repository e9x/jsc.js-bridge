// Automatically generated from /mnt/d/Dev/webkit-04062019/Source/JavaScriptCore/runtime/JSGlobalObject.cpp using /mnt/d/Dev/webkit-04062019/Source/JavaScriptCore/create_hash_table. DO NOT EDIT!

#include "JSCBuiltins.h"
#include "Lookup.h"

namespace JSC {

static const struct CompactHashIndex globalObjectTableIndex[135] = {
    { -1, -1 },
    { 7, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 36, -1 },
    { -1, -1 },
    { 27, -1 },
    { -1, -1 },
    { -1, -1 },
    { 11, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 13, 129 },
    { 0, -1 },
    { 24, -1 },
    { -1, -1 },
    { 28, -1 },
    { -1, -1 },
    { -1, -1 },
    { 12, -1 },
    { 26, -1 },
    { -1, -1 },
    { -1, -1 },
    { 37, 134 },
    { -1, -1 },
    { 34, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 3, 128 },
    { 9, -1 },
    { -1, -1 },
    { -1, -1 },
    { 40, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 8, 130 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 6, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 31, -1 },
    { -1, -1 },
    { 5, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 15, -1 },
    { -1, -1 },
    { 22, -1 },
    { 39, -1 },
    { -1, -1 },
    { -1, -1 },
    { 2, -1 },
    { -1, -1 },
    { -1, -1 },
    { 33, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 35, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 19, 132 },
    { 14, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 1, 131 },
    { -1, -1 },
    { 29, -1 },
    { -1, -1 },
    { 17, -1 },
    { -1, -1 },
    { -1, -1 },
    { 16, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 10, 133 },
    { 21, -1 },
    { 32, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { -1, -1 },
    { 4, -1 },
    { 18, -1 },
    { 20, -1 },
    { 23, -1 },
    { 25, -1 },
    { 30, -1 },
    { 38, -1 },
};

static const struct HashTableValue globalObjectTableValues[41] = {
   { "isNaN", ((static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function)) & ~PropertyAttribute::Function) | PropertyAttribute::Builtin, NoIntrinsic, { (intptr_t)static_cast<BuiltinGenerator>(globalObjectIsNaNCodeGenerator), (intptr_t)1 } },
   { "isFinite", ((static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function)) & ~PropertyAttribute::Function) | PropertyAttribute::Builtin, NoIntrinsic, { (intptr_t)static_cast<BuiltinGenerator>(globalObjectIsFiniteCodeGenerator), (intptr_t)1 } },
   { "escape", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncEscape), (intptr_t)(1) } },
   { "unescape", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncUnescape), (intptr_t)(1) } },
   { "decodeURI", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncDecodeURI), (intptr_t)(1) } },
   { "decodeURIComponent", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncDecodeURIComponent), (intptr_t)(1) } },
   { "encodeURI", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncEncodeURI), (intptr_t)(1) } },
   { "encodeURIComponent", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::Function), NoIntrinsic, { (intptr_t)static_cast<RawNativeFunction>(globalFuncEncodeURIComponent), (intptr_t)(1) } },
   { "eval", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::CellProperty), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_evalFunction)), (intptr_t)(0) } },
   { "globalThis", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::CellProperty), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_globalThis)), (intptr_t)(0) } },
   { "parseInt", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::CellProperty), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_parseIntFunction)), (intptr_t)(0) } },
   { "parseFloat", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::CellProperty), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_parseFloatFunction)), (intptr_t)(0) } },
   { "ArrayBuffer", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_arrayBufferStructure)), (intptr_t)(0) } },
   { "EvalError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_evalErrorStructure)), (intptr_t)(0) } },
   { "RangeError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_rangeErrorStructure)), (intptr_t)(0) } },
   { "ReferenceError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_referenceErrorStructure)), (intptr_t)(0) } },
   { "SyntaxError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_syntaxErrorStructure)), (intptr_t)(0) } },
   { "TypeError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typeErrorStructure)), (intptr_t)(0) } },
   { "URIError", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_URIErrorStructure)), (intptr_t)(0) } },
   { "Proxy", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::PropertyCallback), NoIntrinsic, { (intptr_t)static_cast<LazyPropertyCallback>(createProxyProperty), (intptr_t)(0) } },
   { "Reflect", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::PropertyCallback), NoIntrinsic, { (intptr_t)static_cast<LazyPropertyCallback>(createReflectProperty), (intptr_t)(0) } },
   { "JSON", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::PropertyCallback), NoIntrinsic, { (intptr_t)static_cast<LazyPropertyCallback>(createJSONProperty), (intptr_t)(0) } },
   { "Math", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::PropertyCallback), NoIntrinsic, { (intptr_t)static_cast<LazyPropertyCallback>(createMathProperty), (intptr_t)(0) } },
   { "console", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::PropertyCallback), NoIntrinsic, { (intptr_t)static_cast<LazyPropertyCallback>(createConsoleProperty), (intptr_t)(0) } },
   { "Int8Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayInt8)), (intptr_t)(0) } },
   { "Int16Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayInt16)), (intptr_t)(0) } },
   { "Int32Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayInt32)), (intptr_t)(0) } },
   { "Uint8Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayUint8)), (intptr_t)(0) } },
   { "Uint8ClampedArray", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayUint8Clamped)), (intptr_t)(0) } },
   { "Uint16Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayUint16)), (intptr_t)(0) } },
   { "Uint32Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayUint32)), (intptr_t)(0) } },
   { "Float32Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayFloat32)), (intptr_t)(0) } },
   { "Float64Array", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayFloat64)), (intptr_t)(0) } },
   { "DataView", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_typedArrayDataView)), (intptr_t)(0) } },
   { "Date", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_dateStructure)), (intptr_t)(0) } },
   { "Error", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_errorStructure)), (intptr_t)(0) } },
   { "Boolean", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_booleanObjectStructure)), (intptr_t)(0) } },
   { "Number", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_numberObjectStructure)), (intptr_t)(0) } },
   { "Symbol", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_symbolObjectStructure)), (intptr_t)(0) } },
   { "WeakMap", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_weakMapStructure)), (intptr_t)(0) } },
   { "WeakSet", static_cast<unsigned>(PropertyAttribute::DontEnum|PropertyAttribute::ClassStructure), NoIntrinsic, { (intptr_t)(OBJECT_OFFSETOF(JSGlobalObject, m_weakSetStructure)), (intptr_t)(0) } },
};

static const struct HashTable globalObjectTable =
    { 41, 127, false, nullptr, globalObjectTableValues, globalObjectTableIndex };

} // namespace JSC
