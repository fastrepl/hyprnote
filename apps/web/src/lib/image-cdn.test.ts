import assert from "node:assert/strict";
import test from "node:test";

import { getResizedImageSrcSet, getResizedImageUrl } from "./image-cdn.ts";

test("routes local and static-host assets through the image cdn", () => {
  assert.equal(
    getResizedImageUrl("/images/hero.webp", { width: 30 }),
    "/_vercel/image?url=%2Fimages%2Fhero.webp&w=30&q=75",
  );
  assert.equal(
    getResizedImageUrl("https://static.anarlog.so/team/john.png", {
      width: 30,
    }),
    "/_vercel/image?url=https%3A%2F%2Fstatic.anarlog.so%2Fteam%2Fjohn.png&w=30&q=75",
  );
});

test("uses width-based optimization when the element supplies a crop height", () => {
  const url = getResizedImageUrl("https://static.anarlog.so/team/john.png", {
    width: 30,
    height: 30,
  });

  assert.match(url, /w=30/);
  assert.doesNotMatch(url, /[?&]h=/);
});

test("passes through urls the cdn must not transform", () => {
  const remote = "https://example.com/a.png";
  assert.equal(getResizedImageUrl(remote, { width: 30 }), remote);

  const transformed = "/_vercel/image?url=%2Fa.png&w=30&q=75";
  assert.equal(getResizedImageUrl(transformed, { width: 30 }), transformed);

  assert.equal(
    getResizedImageSrcSet("https://example.com/a.png", 30),
    undefined,
  );

  for (const src of [
    "/logo.svg",
    "/demo.gif?v=1",
    "//example.com/image.png",
    "https://static.anarlog.so.example.com/a.png",
    "https://static.anarlog.so/brand/logo.svg",
  ]) {
    assert.equal(getResizedImageUrl(src, { width: 30 }), src);
    assert.equal(getResizedImageSrcSet(src, 30), undefined);
  }
});

test("builds a 1x/2x srcset", () => {
  const srcSet = getResizedImageSrcSet(
    "https://static.anarlog.so/team/john.png",
    30,
  );

  assert.match(srcSet ?? "", /w=30/);
  assert.match(srcSet ?? "", /1x/);
  assert.match(srcSet ?? "", /w=60/);
  assert.match(srcSet ?? "", /2x/);
});

test("snaps image widths to the CDN allowlist", () => {
  assert.match(getResizedImageUrl("/image.png", { width: 31 }), /w=32&/);
  assert.match(getResizedImageUrl("/image.png", { width: 9000 }), /w=3840&/);
});

test("resizes shared-bucket testimonial avatars at both pixel densities", () => {
  const src = "https://static.fastrepl.com/anarlog/blog/testimonials/tobi.jpg";
  const prefix =
    "/_vercel/image?url=https%3A%2F%2Fstatic.fastrepl.com%2Fanarlog%2Fblog%2Ftestimonials%2Ftobi.jpg";
  assert.equal(getResizedImageUrl(src, { width: 48 }), `${prefix}&w=48&q=75`);
  assert.equal(
    getResizedImageSrcSet(src, 48),
    `${prefix}&w=48&q=75 1x, ${prefix}&w=96&q=75 2x`,
  );
});
