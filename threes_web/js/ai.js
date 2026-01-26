// Threes AI - ONNX Model Inference with LSTM
// Uses ONNX Runtime Web to run the trained recurrent model

class ThreesAI {
    constructor() {
        this.session = null;
        this.isLoaded = false;
        this.hiddenSize = 1024;
        // LSTM state (persists between predictions)
        this.lstmH = null;
        this.lstmC = null;
    }

    async load(modelPath = 'model/onnx_model.onnx') {
        try {
            // Disable multi-threading to avoid crossOriginIsolated requirement
            ort.env.wasm.numThreads = 1;
            ort.env.wasm.simd = true;

            console.log('Loading ONNX model from:', modelPath);
            console.log('ONNX Runtime version:', ort.env.versions?.web || 'unknown');

            // Fetch the model file as ArrayBuffer
            const modelResponse = await fetch(modelPath);
            if (!modelResponse.ok) {
                throw new Error(`Failed to fetch model: ${modelResponse.status} ${modelResponse.statusText}`);
            }
            const modelBuffer = await modelResponse.arrayBuffer();
            console.log('Model file loaded, size:', modelBuffer.byteLength, 'bytes');

            // Load ONNX Runtime Web
            console.log('Creating inference session...');
            this.session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm']
            });

            this.isLoaded = true;
            console.log('AI model loaded successfully!');
            console.log('Input names:', this.session.inputNames);
            console.log('Output names:', this.session.outputNames);

            // Initialize LSTM state
            this.resetState();

            return true;
        } catch (error) {
            console.error('Failed to load AI model.');
            console.error('Error:', error);
            if (error.message) {
                console.error('Message:', error.message);
            }
            if (error.stack) {
                console.error('Stack:', error.stack);
            }
            return false;
        }
    }

    /**
     * Reset LSTM state to zeros (call when starting a new game)
     */
    resetState() {
        this.lstmH = new Float32Array(this.hiddenSize).fill(0);
        this.lstmC = new Float32Array(this.hiddenSize).fill(0);
        console.log('LSTM state reset');
    }

    /**
     * Prepare observation from game state
     * Based on threes.h update_observations():
     * - 16 bytes: grid tile indices (0-16)
     * - 4 bytes: bag counts [bag[0], bag[1], bag[2], total]
     * - 4 bytes: next_box one-hot (maps 1,2,3,4+ to indices 0,1,2,3)
     */
    prepareObservation(game) {
        const obs = new Uint8Array(24);

        // Grid tile indices (0-16), capped at 16
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const idx = i * 4 + j;
                obs[idx] = Math.min(game.grid[i][j], 16);
            }
        }

        // Bag counts at offset 16
        const offset = 16;
        obs[offset] = game.bag[0];
        obs[offset + 1] = game.bag[1];
        obs[offset + 2] = game.bag[2];
        obs[offset + 3] = game.bag[0] + game.bag[1] + game.bag[2];

        // Next box one-hot at offset 20
        // Maps nextTile: 1,2,3,4+ to indices 0,1,2,3
        const nextBoxIndex = Math.min(game.nextTile - 1, 3);
        obs[offset + 4 + nextBoxIndex] = 1;

        return obs;
    }

    /**
     * Run inference and get action probabilities
     * Returns: { action: number, probs: number[], value: number }
     * Actions: 0=UP, 1=DOWN, 2=LEFT, 3=RIGHT
     */
    async predict(game) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded. Call load() first.');
        }

        // Prepare observation
        const obs = this.prepareObservation(game);

        // Convert to int64 tensor
        const inputData = new BigInt64Array(24);
        for (let i = 0; i < 24; i++) {
            inputData[i] = BigInt(obs[i]);
        }

        // Create input tensors
        const obsTensor = new ort.Tensor('int64', inputData, [1, 24]);
        const lstmHTensor = new ort.Tensor('float32', this.lstmH, [1, this.hiddenSize]);
        const lstmCTensor = new ort.Tensor('float32', this.lstmC, [1, this.hiddenSize]);

        // Run inference with LSTM state
        const feeds = {
            'observations': obsTensor,
            'lstm_h': lstmHTensor,
            'lstm_c': lstmCTensor
        };
        const results = await this.session.run(feeds);

        // Get outputs
        const logits = results['logits'].data;
        const value = results['value'].data[0];
        const newLstmH = results['lstm_h_out'].data;
        const newLstmC = results['lstm_c_out'].data;

        // Update LSTM state for next prediction
        this.lstmH = new Float32Array(newLstmH);
        this.lstmC = new Float32Array(newLstmC);

        // Softmax to get probabilities
        const probs = this.softmax(Array.from(logits));

        // Select action with highest probability
        const action = probs.indexOf(Math.max(...probs));

        // Debug logging
        console.log('Raw logits:', Array.from(logits).map(x => x.toFixed(2)));
        console.log('Probs:', probs.map(p => (p * 100).toFixed(1) + '%'));
        console.log('Action:', ['UP', 'DOWN', 'LEFT', 'RIGHT'][action]);

        return {
            action,      // 0=UP, 1=DOWN, 2=LEFT, 3=RIGHT
            probs,       // [p_up, p_down, p_left, p_right]
            value        // State value estimate
        };
    }

    /**
     * Get recommended move direction constant
     * Returns: UP(0), DOWN(1), LEFT(2), or RIGHT(3) matching game.js constants
     */
    async getMove(game) {
        const result = await this.predict(game);
        return result.action;
    }

    /**
     * Run inference WITHOUT updating LSTM state (for expectimax leaf evaluation)
     * This allows exploring hypothetical states without corrupting the real LSTM state
     */
    async predictWithoutStateUpdate(game) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded. Call load() first.');
        }

        // Prepare observation
        const obs = this.prepareObservation(game);

        // Convert to int64 tensor
        const inputData = new BigInt64Array(24);
        for (let i = 0; i < 24; i++) {
            inputData[i] = BigInt(obs[i]);
        }

        // Create input tensors - use zeros for LSTM state (stateless evaluation)
        const obsTensor = new ort.Tensor('int64', inputData, [1, 24]);
        const lstmHTensor = new ort.Tensor('float32', new Float32Array(this.hiddenSize).fill(0), [1, this.hiddenSize]);
        const lstmCTensor = new ort.Tensor('float32', new Float32Array(this.hiddenSize).fill(0), [1, this.hiddenSize]);

        // Run inference
        const feeds = {
            'observations': obsTensor,
            'lstm_h': lstmHTensor,
            'lstm_c': lstmCTensor
        };
        const results = await this.session.run(feeds);

        // Get outputs (don't update state)
        const logits = results['logits'].data;
        const value = results['value'].data[0];

        // Softmax to get probabilities
        const probs = this.softmax(Array.from(logits));
        const action = probs.indexOf(Math.max(...probs));

        return {
            action,
            probs,
            value
        };
    }

    softmax(logits) {
        const maxLogit = Math.max(...logits);
        const exps = logits.map(x => Math.exp(x - maxLogit));
        const sumExps = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sumExps);
    }
}

// Export for use in browser
window.ThreesAI = ThreesAI;
