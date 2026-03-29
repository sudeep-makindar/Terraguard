package com.sentinel.app.share

import android.net.Uri
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object DossierShareDispatcher {
    private val _shareUris = MutableSharedFlow<Uri>(extraBufferCapacity = 1)
    val shareUris = _shareUris.asSharedFlow()

    fun emit(uri: Uri) {
        _shareUris.tryEmit(uri)
    }
}
