# hypr-github

> A GitHub App built with [Probot](https://github.com/probot/probot) that GitHub app for Hyprnote

## Setup

```sh
# Install dependencies
npm install

# Compile
npm build

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t hypr-github .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> hypr-github
```

## Contributing

If you have suggestions for how hypr-github could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2025 Hyprnote <dev@hyprnote.com>
