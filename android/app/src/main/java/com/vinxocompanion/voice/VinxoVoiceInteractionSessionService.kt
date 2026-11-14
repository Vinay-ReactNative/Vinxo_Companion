package com.vinxocompanion.voice

import android.os.Bundle
import android.service.voice.VoiceInteractionSession
import android.service.voice.VoiceInteractionSessionService
import android.util.Log

class VinxoVoiceInteractionSessionService :
    VoiceInteractionSessionService() {

    override fun onNewSession(args: Bundle): VoiceInteractionSession {
    Log.d("VINXO_ASSISTANT", "onNewSession() called")

    return VinxoVoiceInteractionSession(this)
}
}