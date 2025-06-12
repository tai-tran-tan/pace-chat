import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.gradle.api.tasks.testing.logging.TestLogEvent.FAILED
import org.gradle.api.tasks.testing.logging.TestLogEvent.PASSED
import org.gradle.api.tasks.testing.logging.TestLogEvent.SKIPPED
import org.jetbrains.kotlin.gradle.dsl.jvm.JvmTargetValidationMode.IGNORE
import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile

plugins {
    kotlin("jvm") version "2.1.20"
    application
    id("io.vertx.vertx-plugin") version "1.4.0" // Vert.x Gradle plugin
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.23" // Kotlinx Serialization
    id("com.github.johnrengelman.shadow") version "7.1.2"
//    kotlin("plugin.lombok") version "2.1.21"
//    id("io.freefair.lombok") version "8.13"
}

group = "com.pace"
version = "0.0.1-SNAPSHOT"

repositories {
    mavenCentral()
}

// Define Vert.x version
val vertxVersion = "4.5.15"
val junitJupiterVersion = "5.9.1"


val mainVerticleName = "com.pace.MainVerticle"
val launcherClassName = "io.vertx.core.Launcher"
val watchForChange = "src/**/*"

val doOnChange = "${projectDir}/gradlew classes"

application {
    mainClass.set(launcherClassName)
}
//val launcherClassName = "io.vertx.launcher.application.VertxApplication"

application {
    mainClass.set(launcherClassName)
}
vertx {
    mainVerticle = mainVerticleName
}

dependencies {
    // Vert.x Core & Web
    implementation("io.vertx:vertx-core:$vertxVersion")
    implementation("io.vertx:vertx-web:$vertxVersion")
    implementation("io.vertx:vertx-web-client:$vertxVersion")
    implementation("io.vertx:vertx-json-schema:$vertxVersion") // For basic JSON schema if needed
    implementation("io.vertx:vertx-auth-jwt:$vertxVersion") // For JWT authentication
    implementation("com.auth0:java-jwt:4.5.0")
    // Kotlinx Serialization for JSON (Vert.x doesn't bundle it, we use it directly)
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.19.0")

    // Vert.x Kotlin Coroutines
    implementation("io.vertx:vertx-lang-kotlin-coroutines:$vertxVersion")
    implementation("io.vertx:vertx-lang-kotlin:$vertxVersion")

    // Logging
//    implementation("ch.qos.logback:logback-classic:1.4.14")
//    implementation("io.github.microutils:kotlin-logging:3.0.5") // For easy Kotlin logging
    implementation("io.klogging:klogging-jvm:0.10.1")

    // UUID generation (built-in in JVM, but useful to list)
    // No explicit dependency needed for java.util.UUID

    // For java.time.Instant serialization/deserialization with kotlinx.serialization
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")

    // Testing
    testImplementation("io.vertx:vertx-junit5:$vertxVersion")
//    testImplementation("io.vertx:vertx-web-client-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.junit.jupiter:junit-jupiter-api:$junitJupiterVersion")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:$junitJupiterVersion")
}

//val compileKotlin: KotlinCompile by tasks
//compileKotlin.kotlinOptions.jvmTarget = "21"

tasks.withType<KotlinJvmCompile>().configureEach {
    jvmTargetValidationMode.set(IGNORE)
}

tasks.withType<ShadowJar> {
    archiveClassifier.set("fat")
    manifest {
        attributes(mapOf("Main-Verticle" to mainVerticleName))
    }
    mergeServiceFiles()
}

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging {
        events = setOf(PASSED, SKIPPED, FAILED)
    }
}

tasks.withType<JavaExec> {
    args = listOf("run", mainVerticleName, "--redeploy=$watchForChange", "--launcher-class=$launcherClassName", "--on-redeploy=$doOnChange")
}
