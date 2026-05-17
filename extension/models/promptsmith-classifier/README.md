# 🧠 PromptSmith Local ONNX Model Destination

This directory is the runtime destination for your custom-trained local prompt classification model assets.

## 📂 Expected Directory Structure

When you finish training your model in the **Google Colab Notebook** (`train_classifier.ipynb`), it will automatically download a file named `promptsmith-onnx.zip`. 

Extract the contents of that ZIP file directly into this directory so that it looks exactly like this:

```tree
extension/
└── models/
    └── promptsmith-classifier/
        ├── README.md               <-- (This file)
        ├── config.json             <-- Model architecture configuration
        ├── model_quantized.onnx     <-- 8-bit Quantized ONNX Model (<15MB!)
        ├── special_tokens_map.json  <-- Tokenizer special character maps
        ├── tokenizer.json          <-- Tokenizer vocabulary & serialization
        └── tokenizer_config.json   <-- Tokenizer parameters & settings
```

## ⚡ What Happens Next?

Once these 5 files are placed in this folder, **PromptSmith** will instantly switch from running local offline templates to executing high-performance **in-browser neural network classification** using **WebGPU hardware acceleration** (with seamless CPU-WASM fallback)!

1. **Service Worker Loading**: The extension service worker (`dist/background.js`) loads the ONNX engine in a separate sandboxed thread via Transformers.js.
2. **Zero Network Latency**: Zero API keys are needed, zero costs are incurred, and your prompt texts never leave your local computer.
3. **Hardware Speed**: WebGPU runs the neural classification in under 10-50 milliseconds!
