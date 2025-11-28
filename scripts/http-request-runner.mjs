#!/usr/bin/env node

import fs from "fs";

const argPairs = process.argv.slice(2);

function parseArgs(pairs) {
  const result = { headers: [] };
  for (let i = 0; i < pairs.length; i++) {
    const part = pairs[i];
    if (!part.startsWith("--")) {
      throw new Error(`Unexpected argument: ${part}`);
    }
    const key = part.slice(2);
    const value = pairs[i + 1];
    if (value === undefined) {
      throw new Error(`Missing value for --${key}`);
    }
    i++;
    switch (key) {
      case "url":
        result.url = value;
        break;
      case "method":
        result.method = value.toUpperCase();
        break;
      case "body":
        result.body = value;
        break;
      case "body-file":
        result.bodyFile = value;
        break;
      case "header":
        result.headers.push(value);
        break;
      case "output":
        result.output = value;
        break;
      case "timeout":
        result.timeoutMs = Number.parseInt(value, 10);
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }
  return result;
}

async function main() {
  let options;
  try {
    options = parseArgs(argPairs);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!options.url) {
    console.error("--url is required");
    process.exit(1);
  }

  const method = options.method ?? "POST";
  let body = options.body ?? null;

  if (options.bodyFile) {
    try {
      body = fs.readFileSync(options.bodyFile, "utf8");
    } catch (error) {
      console.error(`Failed to read body file: ${error.message}`);
      process.exit(1);
    }
  }

  const headers = {};
  for (const header of options.headers) {
    const idx = header.indexOf(":");
    if (idx === -1) {
      console.error(`Invalid header format: ${header}`);
      process.exit(1);
    }
    const key = header.slice(0, idx).trim();
    const value = header.slice(idx + 1).trim();
    headers[key] = value;
  }

  const controller = new AbortController();
  let timeoutId;
  if (options.timeoutMs) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs);
  }

  try {
    const response = await fetch(options.url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Request failed: ${response.status} ${response.statusText}\n${text}`);
      process.exit(1);
    }

    if (options.output) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(options.output, buffer);
      console.log(`Saved response to ${options.output}`);
    } else {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        console.log(JSON.stringify(json, null, 2));
      } else {
        const text = await response.text();
        console.log(text);
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out");
    } else {
      console.error(`Request error: ${error.message}`);
    }
    process.exit(1);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

main();
