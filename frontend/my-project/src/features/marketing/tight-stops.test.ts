import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tightStops } from "./tight-stops";

const html = (text: string) => renderToStaticMarkup(createElement(Fragment, null, tightStops(text)));

describe("tightStops", () => {
  it("wraps every full stop and comma that ends a word", () => {
    expect(html("Straight answers.")).toBe('Straight answers<span class="tight-stop">.</span>');
    expect(html("Pay for what you use. Nothing hidden.")).toBe(
      'Pay for what you use<span class="tight-stop">.</span> Nothing hidden<span class="tight-stop">.</span>',
    );
    expect(html("Make every post look right, everywhere.")).toBe(
      'Make every post look right<span class="tight-stop">,</span> everywhere<span class="tight-stop">.</span>',
    );
  });

  it("leaves numbers, ratios and text without punctuation alone", () => {
    expect(tightStops("Free tools for everyone")).toBe("Free tools for everyone");
    expect(html("2.5 MB, 1,080 px and 9:16")).toBe('2.5 MB<span class="tight-stop">,</span> 1,080 px and 9:16');
  });
});
