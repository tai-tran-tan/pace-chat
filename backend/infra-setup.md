### Start Cassandra and Keycloak + Posgres
```bash
docker compose -f docker-compose.yaml up -d
```
# Developer Setup Instructions

This document provides comprehensive instructions for configuring and utilizing `cqlsh` and DBeaver Community Edition to interact with a Cassandra database.

## 1. `cqlsh` Configuration

The following sections detail the process of downloading, installing, and operating `cqlsh` for Cassandra database interaction.

### 1.1. `cqlsh` Acquisition

To obtain the `cqlsh` utility, please download the package from the official DataStax repository:

* **Download Link:** <https://downloads.datastax.com/enterprise/cqlsh-5.1.tar.gz>

### 1.2. `cqlsh` Installation

For detailed installation procedures, refer to the official DataStax documentation:

* **Installation Guide:** <https://docs.datastax.com/en/archived/ddac/doc/datastax_enterprise/install/installCqlsh.html>

  * **Summary of Key Steps (refer to the comprehensive guide for specific details):**

    * Decompress the downloaded `tar.gz` archive into a designated directory (e.g., `/opt/cqlsh`).

    * Verify the installation of Python 2.7 or a compatible version, as specified in the documentation.

    * Integrate the `cqlsh` directory into your system's `PATH` environment variable to facilitate direct execution.

### 1.3. `cqlsh` Initialization

Upon successful installation, `cqlsh` can be initiated to establish a connection with your Cassandra cluster:

* **`cqlsh` Startup Guide:** <https://docs.datastax.com/en/archived/ddaccql/doc/cql/cql_using/startCqlshStandalone.html>

  * **Standard Command Syntax:**

    ```
    cqlsh [your_cassandra_ip] [port]
    
    ```

    * Replace `[your_cassandra_ip]` with the IP address of your Cassandra node (e.g., `127.0.0.1` for a local instance).

    * The default port for Cassandra is `9042`.

### 1.4. Script Execution from File

To execute a CQL script contained within a file, employ the `SOURCE` command within the `cqlsh` environment:

* **Command:**

``` csql
SOURCE './infra/bootstrap.cql'
```


* Ensure that the `bootstrap.cql` file is accessible from the current working directory of `cqlsh`, or provide the complete file path.

### 2.2. DBeaver Installation

Execute the downloaded installer and adhere to the on-screen instructions. The installation process is typically straightforward.

### 2.3. Cassandra JDBC Driver Configuration (Custom)

To establish a connection to Cassandra using a specific JDBC driver, follow these steps:

1. **Driver Acquisition:**
   Download the desired JDBC driver JAR file from the following repository:

    * **Driver Releases:** <https://github.com/ing-bank/cassandra-jdbc-wrapper/releases>
      Select the appropriate release and download the `.jar` file (e.g., `cassandra-jdbc-wrapper-X.Y.Z.jar`).

2. **Launch DBeaver.**

3. **Configure Driver in DBeaver:**

    * Navigate to `Database` > `Driver Manager`.

    * Click `New` to create a new driver definition.

    * In the "Create new driver" dialog:

        * **Driver Name:** Provide a descriptive name (e.g., `Cassandra JDBC Wrapper`).

        * **Class Name:** This may auto-populate after adding the JAR. If not, refer to the driver's documentation (commonly `com.ing.data.cassandra.jdbc.CassandraDriver`).

        * **URL Template:** Set the URL template for Cassandra connections. A common format is `jdbc:cassandra://{host}:{port}/{keyspace}`.

        * Go to the `Libraries` tab.

        * Click `Add File...` and select the `cassandra-jdbc-wrapper-X.Y.Z.jar` file you downloaded.

        * Click `OK` to save the new driver definition.

4. **Create New Database Connection:**

    * Navigate to `Database` > `New Database Connection`.

    * In the "Connect to a database" wizard, locate and select the custom driver you just created (e.g., `Cassandra JDBC Wrapper`). Proceed by clicking `Next`.

    * **Connection Parameters:**

        * **Host:** Input the IP address of your Cassandra node (e.g., `127.0.0.1`).

        * **Port:** Specify the Cassandra native transport port (default: `9042`).

        * **Database/Keyspace:** Optionally, specify the initial keyspace to connect to.

        * **Authentication:** If your Cassandra cluster necessitates authentication, provide the corresponding `Username` and `Password`.

        * Click `Test Connection...` to validate the connectivity. Upon successful validation, click `Finish`.

### 2.4. Script Execution from File in DBeaver

To execute a script from a file using DBeaver, perform the following actions:

1. Once connected to your Cassandra database in DBeaver, expand your connection within the "Database Navigator" panel.

2. Right-click on your connection or the desired keyspace.

3. Select `SQL Editor` > `Open SQL Script`.

4. Browse to and select your `infra/bootstrap.cql` file.

5. The script will be displayed in a new SQL editor tab.

6. Initiate script execution by clicking the `Execute SQL Script` button (typically represented by a green triangle icon).