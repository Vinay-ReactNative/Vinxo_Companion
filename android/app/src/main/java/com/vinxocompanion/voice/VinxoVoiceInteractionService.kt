package com.vinxocompanion.voice

import android.service.voice.VoiceInteractionService
import android.util.Log

class VinxoVoiceInteractionService :
    VoiceInteractionService() {

    override fun onReady() {
        super.onReady()

        Log.d(
            "VINXO_ASSISTANT",
            "VINXO VoiceInteractionService is READY"
        )
    }

    override fun onShutdown() {
        super.onShutdown()

        Log.d(
            "VINXO_ASSISTANT",
            "VINXO VoiceInteractionService shutting down"
        )
    }
}