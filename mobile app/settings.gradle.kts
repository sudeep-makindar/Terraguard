pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven(url = "https://jitpack.io")
    }
}

rootProject.name = "Sentinel"
include(
    ":app",
    ":core-common",
    ":core-model",
    ":core-navigation",
    ":data-sensor",
    ":feature-dashboard",
    ":feature-citizen-report",
    ":feature-map",
    ":feature-logs",
    ":feature-node-detail"
)
