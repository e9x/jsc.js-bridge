@echo off

gn gen out --args="target_os=\"wasm\""
ninja -C out