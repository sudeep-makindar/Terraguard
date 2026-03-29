package com.sentinel.core.navigation

import kotlinx.serialization.Serializable

@Serializable
sealed interface SentinelRoute {
    @Serializable
    data object Dashboard : SentinelRoute

    @Serializable
    data object LiveMap : SentinelRoute

    @Serializable
    data object Logs : SentinelRoute

    @Serializable
    data object CitizenReport : SentinelRoute

    @Serializable
    data class NodeDetail(val nodeId: String) : SentinelRoute
}
