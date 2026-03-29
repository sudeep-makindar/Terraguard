package com.sentinel.app.share

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

data class FirDraftPayload(
    val portalUrl: String,
    val draftText: String
)

object FirAutomationDispatcher {
    private val _payloads = MutableSharedFlow<FirDraftPayload>(extraBufferCapacity = 1)
    val payloads = _payloads.asSharedFlow()

    fun emit(payload: FirDraftPayload) {
        _payloads.tryEmit(payload)
    }
}
