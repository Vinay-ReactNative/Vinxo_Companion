package com.vinxocompanion.voice

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.TextView
import android.widget.FrameLayout
import android.service.voice.VoiceInteractionSession
import android.util.Log
import com.facebook.react.interfaces.fabric.ReactSurface
import com.vinxocompanion.MainApplication
class VinxoVoiceInteractionSession(
    context: Context
) : VoiceInteractionSession(context) {

    init {
        Log.d("VINXO_ASSISTANT", "Session constructor called")
    }
    private var reactSurface:ReactSurface? = null

    override fun onCreateContentView(): View {

        val application = context.applicationContext as MainApplication

        val initialProps = Bundle().apply { 
            putString("surface", "assistant")
         }

         val surface = application.reactHost.createSurface(context, "VinxoCompanion", initialProps)

         reactSurface = surface

         val surfaceView = surface.view

Log.d(
    "VINXO_ASSISTANT",
    "Surface view before start: ${surfaceView != null}"
)

surface.start()

Log.d(
    "VINXO_ASSISTANT",
    "Surface view after start: ${surface.view != null}"
)
Log.d(
    "VINXO_ASSISTANT",
    "Returned view: ${surface.view?.javaClass?.name}"
)


val contentView = surface.view ?: FrameLayout(context)

           android.util.Log.d(
            "VINXO_ASSISTANT",
            "React Native assistant surface started"
        )

        Log.d(
    "VINXO_ASSISTANT",
    "Content view parent: ${contentView.parent}"
)
        return contentView
    }

    override fun onShow(args: Bundle?, showFlags: Int) {
        super.onShow(args, showFlags)

        android.util.Log.d(
            "VINXO_ASSISTANT",
            "Voice interaction session displayed"
        )
        Log.d(
    "VINXO_ASSISTANT",
    "Content view parent after show: ${reactSurface?.view?.parent}"
)
Log.d(
    "VINXO_ASSISTANT",
    "Surface dimensions: ${reactSurface?.view?.width} x ${reactSurface?.view?.height}"
)

Log.d(
    "VINXO_ASSISTANT",
    "Surface visibility: ${reactSurface?.view?.visibility}"
)
reactSurface?.view?.post {
    val view = reactSurface?.view

    Log.d(
        "VINXO_ASSISTANT",
        "Surface after layout: ${view?.width} x ${view?.height}"
    )

    Log.d(
        "VINXO_ASSISTANT",
        "Surface measured: ${view?.measuredWidth} x ${view?.measuredHeight}"
    )

    Log.d(
        "VINXO_ASSISTANT",
        "Surface attached: ${view?.isAttachedToWindow}"
    )
}
    }

    override fun onHide() {
        super.onHide()

        android.util.Log.d(
            "VINXO_ASSISTANT",
            "Voice interaction session hidden"
        )
    }
}