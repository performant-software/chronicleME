This is an experimental interface for viewing variant text. Development was begun at the [Huygens Institute](http://huygens.knaw.nl/) in early 2016 in the context of a design sprint centred around the concept of "text-as-graph", particularly as used in the [Stemmaweb](https://stemmaweb.net/) tools.

This fork has updated the original proof of concept to use live data, and reworked it to be supported by the [Create React App](https://github.com/facebook/create-react-app) infrastructure.

## Requirements

-   Node.JS 14+, npm 7+
-   Python 3
-   [Graphviz](https://graphviz.org/)

## Setup

### Install Dependencies

Within the root directory, install dependencies required to run the application:

```sh
npm install
```

### Environment Variables

1. Within the root directory, create a new file named `.env`. **It is highly recommended that this file be git-ignored in order to avoid committing sensitive data into version control.**

2. In the newly created `.env` file, add the following environment variables:

-   **`PUBLIC_URL`**
    -   Ex: `PUBLIC_URL=enter_url_here_with_no_spaces_or_quotes`
-   **`REACT_APP_MAPBOX_TOKEN`**
    -   Ex: `REACT_APP_MAPBOX_TOKEN=enter_token_here_with_no_spaces_or_quotes`
    -   A Mapbox token can be obtained from the [Mapbox website](www.mapbox.com) - see the "Access tokens" section of your Mapbox account page.
-   **`REACT_APP_HOMEPATH`**
    -   Ex: `REACT_APP_HOMEPATH=/ChronicleME/`

### API Configuration

1. Within the `/script` directory, create a new file named `lemma-html-config.json`. **It is highly recommended that this file be git-ignored in order to avoid committing sensitive data into version control** - this is why we provide an example file (`lemma-html-config.json.example`), rather than the file itself, on GitHub.

2. In the newly created `lemma-html-config.json` file, add a JSON object with the following keys (be sure to update with your own values):

```json
{
    "options": {
        "repository": "repository URL goes inside these quotes",
        "tradition_id": "tradition ID goes inside these quotes"
    },
    "auth": {
        "username": "API auth username goes inside these quotes",
        "password": "API auth password goes inside these quotes"
    }
}
```

**Note** - an example file, `lemma-html-config.json.example`, has been provided as an example.

### Data Generation

Within the root directory, run the following command:

```sh
node script/generateAllData.js
```

## Local Development

Run the application locally:

```sh
npm run start
```

## Deploying

**Within the project root directory:**

```
npm run build
zip -r <buildID> build
scp <buildID>.zip <user>:<pass>@<hostname>:<path>
```

For Stemmaweb, the final argument should be something like `edition@monitor.stemmaweb.net:.`.

**On the server:**

```sh
rm -rf build
unzip <buildID>
rm -rf www/*
cp -r build/* www
```

## DTS support

To support [DTS](https://distributed-text-services.github.io/specifications/) navigation and document endpoints using [DTSflat-server](https://github.com/robcast/dtsflat-server) and [Simple tei2dtsflat](https://github.com/robcast/simple-tei2dtsflat), follow the following instructions.

### Dependency Installation

Navigate to the `/script` directory and clone the simple-tei2dtsflat repo.

```sh
cd script
git clone https://github.com/performant-software/simple-tei2dtsflat.git
cd ..
```

### DTS Data Generation

From the project root directory, run the following command:

```sh
node script/generateDtsData.js
```

This will create a new timestamped directory in the `public/data` folder, containing a DTSFlat file structure of all manuscripts and the lemma edition.

### DTS Endpoint Nginx Configuration

In order to set up a server with DTS, you may follow the instructions at the [DTSflat-server](https://github.com/robcast/dtsflat-server) repo. Just copy your new DTS data directory (`public/data/dts-data_YYYY-MM-DD_hh:mm:ss`) to the `DTS_DATA_DIR` location you set in `.env` when following that repo.

If you wish to serve the DTS endpoints from the same server as the critical edition, you will need to modify the Nginx configuration. For example, our development server uses the following configuration to serve the DTS endpoints on port 3333, pulling data from the `/var/www/dts-data` directory.

<details>
<summary>Nginx configuration for port 3333</summary>

```conf
server {
  listen       3333 default_server;
  listen  [::]:3333 default_server;

  server_name _;

  access_log /var/log/nginx/access-dts.log;
  error_log /var/log/nginx/error-dts.log debug;

  # add CORS header to all responses
  add_header Access-Control-Allow-Origin "*";

  # base for all try_files
  root /var/www/dts-data;

  # map DTS documents endpoint to files
  location /dts/documents {
      default_type text/xml;
      # second try works with empty $arg_ref but fails with invalid $arg_ref
      try_files /$arg_id/$arg_ref/tei-frag.xml /$arg_id$arg_ref/tei-full.xml =400;
  }

  # map DTS navigation endpoint to files
  location /dts/navigation {
      default_type application/json;
      try_files /$arg_id$ref_path$level_path/dts-nav.json =400;
  }
}


map $arg_ref $ref_path {
  default "";
  ~(.+) /$1;
}

map $arg_level $level_path {
  default "";
  ~(.+) /$1;
}
```

</details>

With this configuration, when you are ready to regenerate the DTS data, you can run the script and then replace the contents of `/var/www/dts-data` on the server with the contents of the latest `public/data/dts-data_YYYY-MM-DD_hh:mm:ss` directory. For example, with rsync, from the project root directory on your local machine, the command might look something like this with [rsync](https://www.digitalocean.com/community/tutorials/how-to-use-rsync-to-sync-local-and-remote-directories):

```sh
rsync -ar --delete public/data/dts-data_YYYY-MM-DD_hh:mm:ss/. user@server:/var/www/dts-data
```

We run it with the following additional options in order to ensure MacOS Spotlight `.DS_Store` files are not included:

```sh
rsync -arv --exclude=.DS_Store --delete-excluded --delete public/data/dts-data_YYYY-MM-DD_hh:mm:ss/. user@server:/var/www/dts-data
```
