const getPreprocessor = require("./index");
const fs = require("fs");
const {
  cleanFiles,
  populateFiles,
  getReplaceImages
} = require("../test/helpers");

beforeEach(cleanFiles);

describe("the main export", () => {
  test("the module returns a function", () => {
    expect(() => getPreprocessor()).not.toThrow();
    expect(typeof getPreprocessor().markup).toEqual("function");
  });

  test("it does fine with basic markup", async () => {
    const { markup } = getPreprocessor();
    const content = `<p>It works.</p>`;

    const { code } = await markup({ content: content });
    expect(code).toEqual(`<p>It works.</p>`);
  });
});

describe("extension filtering", () => {
  test("it filters on extensions independently", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementationOnce(() => {});

    populateFiles({
      "for/imageTag.jpg": "1.jpg",
      "for/imageTag.png": "4.png",
      "using/imageComponent.jpg": "1.jpg",
      "using/imageComponent.png": "4.png"
    });

    const replaceImages = getReplaceImages({
      imgTagExtensions: ["jpg", "png"],
      componentExtensions: ["jpg"],
      sizes: [200]
    });

    expect(await replaceImages(`<img src="/for/imageTag.jpg">`)).toEqual(
      `<img src="g/for/imageTag.jpg">`
    );
    expect(fs.existsSync("./static/g/for/imageTag.jpg")).toBeTruthy();

    expect(await replaceImages(`<img src="/for/imageTag.png">`)).toEqual(
      `<img src="g/for/imageTag.png">`
    );
    expect(fs.existsSync("./static/g/for/imageTag.png")).toBeTruthy();

    expect(
      await replaceImages(`<Image src="/using/imageComponent.jpg"/>`)
    ).not.toEqual(`<Image src="/using/imageComponent.jpg"/>`);
    expect(
      fs.existsSync("./static/g/using/imageComponent-200.jpg")
    ).toBeTruthy();

    expect(
      await replaceImages(`<Image src="/using/imageComponent.png"/>`)
    ).toEqual(`<Image src="/using/imageComponent.png"/>`);
    expect(
      fs.existsSync("./static/g/using/imageComponent-200.png")
    ).not.toBeTruthy();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch("imageComponent.png");
  });
});

describe("inlining images in <img> tags", () => {
  test("works below threshold", async () => {
    populateFiles({
      "a.png": "github.png"
    });
    const replaceImages = getReplaceImages({
      inlineBelow: 999999999
    });

    expect(await replaceImages(`<img src="/a.png">`)).toMatch(
      /<img src="data:image\/png;base64,[^"]+">/
    );
    expect(fs.existsSync("./static/g/a.png")).not.toBeTruthy();
  });

  test("ignores above threshold", async () => {
    populateFiles({
      "a.png": "github.png"
    });
    const replaceImages = getReplaceImages({
      inlineBelow: 1
    });

    expect(await replaceImages(`<img src="/a.png">`)).toMatch(
      `<img src="g/a.png">`
    );
    expect(fs.existsSync("./static/g/a.png")).toBeTruthy();
  });
});
