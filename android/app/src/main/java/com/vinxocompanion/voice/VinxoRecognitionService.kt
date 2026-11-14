package com.vinxocompanion.voice

import android.content.Intent
import android.speech.RecognitionService
import android.speech.SpeechRecognizer
import android.util.Log

class VinxoRecognitionService : RecognitionService() {

    override fun onStartListening(intent: Intent, listener: Callback) {
        Log.w(
            "VINXO_ASSISTANT",
            "Speech recognition was requested but no recognition engine is configured."
        )
        listener.error(SpeechRecognizer.ERROR_CLIENT)
    }

    override fun onStopListening(listener: Callback) = Unit

    override fun onCancel(listener: Callback) = Unit
}
