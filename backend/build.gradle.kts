import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.gradle.api.tasks.testing.logging.TestLogEvent.FAILED
import org.gradle.api.tasks.testing.logging.TestLogEvent.PASSED
import org.gradle.api.tasks.testing.logging.TestLogEvent.SKIPPED
import org.jetbrains.kotlin.gradle.dsl.jvm.JvmTargetValidationMode.IGNORE
import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile

plugins {
    kotlin("jvm") version "2.1.20"
    kotlin("kapt") version "1.9.22"
    java
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

val mainVerticleName = "com.pace.MainVerticle"
val launcherClassName = "io.vertx.launcher.application.VertxApplication"
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

// Define Vert.x version
val vertxVersion = "5.0.1"
val junitJupiterVersion = "5.9.1"

dependencies {
    // Vert.x Core & Web
    implementation(platform("io.vertx:vertx-stack-depchain:$vertxVersion"))
    implementation("io.vertx:vertx-launcher-application:$vertxVersion")
    implementation("io.vertx:vertx-core:$vertxVersion")
    implementation("io.vertx:vertx-web:$vertxVersion")
    implementation("io.vertx:vertx-web-validation:$vertxVersion")
    implementation("io.vertx:vertx-web-client:$vertxVersion")
    implementation("io.vertx:vertx-json-schema:$vertxVersion") // For basic JSON schema if needed
    implementation("io.vertx:vertx-auth-oauth2:$vertxVersion")
    implementation("io.vertx:vertx-auth-jwt:$vertxVersion") // For JWT authentication
    implementation("com.auth0:java-jwt:4.5.0")
    implementation("com.auth0:jwks-rsa:0.22.2")
//    implementation("org.keycloak:keycloak-authz-client:26.0.6") //23.0.7

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.19.0")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    val datastaxVersion = "4.17.0"
    implementation("com.datastax.oss:java-driver-core:$datastaxVersion")
    implementation("com.datastax.oss:java-driver-mapper-runtime:$datastaxVersion")
    kapt("com.datastax.oss:java-driver-mapper-processor:$datastaxVersion")
//    implementation("com.datastax.cassandra:cassandra-driver-extras:$datastaxVersion")


    // Vert.x Kotlin Coroutines
    implementation("io.vertx:vertx-lang-kotlin-coroutines:$vertxVersion")
    implementation("io.vertx:vertx-lang-kotlin:$vertxVersion")

    implementation("io.vertx:vertx-config:$vertxVersion")
    implementation("io.vertx:vertx-config-hocon:$vertxVersion")

    implementation("com.google.inject:guice:7.0.0")

    // Logging
    implementation("org.slf4j:slf4j-api:2.0.13") // Or your desired SLF4J API version
    implementation("org.apache.logging.log4j:log4j-slf4j2-impl:2.23.1")
    implementation("org.apache.logging.log4j:log4j-core:2.23.1") // Or the latest version
    implementation("org.apache.logging.log4j:log4j-api-kotlin:1.3.0") // Or the latest version

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
    args = listOf(mainVerticleName)
//    args = listOf(
//        "run", mainVerticleName,
//        "--redeploy=$watchForChange",
//        "--launcher-class=$launcherClassName",
//        "--on-redeploy=$doOnChange",
//    )
}

tasks.withType<Jar>() {
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}