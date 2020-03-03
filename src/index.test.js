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

describe("folder image processing", () => {
  test("it creates assets for all images", async () => {
    populateFiles({
      "images/1.jpg": "1.jpg",
      "images/2.jpg": "1.jpg",
      "images/3.png": "4.png"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["images"],
      processFoldersExtensions: ["jpg", "png"]
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/images/1.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/images/2.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/images/3.png")).toBeTruthy();
  });

  test("by default, it creates assets non-recursively", async () => {
    populateFiles({
      "images/1.jpg": "1.jpg",
      "images/2.jpg": "1.jpg",
      "images/3.png": "4.png",
      "images/subfolder/1.jpg": "1.jpg",
      "images/subfolder/2.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["images"],
      processFoldersExtensions: ["jpg", "png"]
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/images/1.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/images/2.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/images/3.png")).toBeTruthy();
    expect(fs.existsSync("./static/g/images/subfolder/1.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/images/subfolder/2.jpg")).not.toBeTruthy();
  });

  test("optionally, it creates assets recursively", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg",
      "recurse/2.jpg": "1.jpg",
      "recurse/3.png": "4.png",
      "recurse/subfolder/1.jpg": "1.jpg",
      "recurse/subfolder/2.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg", "png"],
      processFoldersRecursively: true
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/recurse/1.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3.png")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/subfolder/1.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/subfolder/2.jpg")).toBeTruthy();
  });

  test("optionally, it creates asset sizes as well", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg",
      "recurse/2.jpg": "1.jpg",
      "recurse/3.png": "4.png",
      "recurse/subfolder/1.jpg": "1.jpg",
      "recurse/subfolder/2.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      sizes: [100, 200],
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg", "png"],
      processFoldersRecursively: true,
      processFoldersSizes: true
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/recurse/1-100.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/1-200.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2-100.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2-200.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3-100.png")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3-200.png")).toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/1-100.jpg")
    ).toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/1-200.jpg")
    ).toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/2-100.jpg")
    ).toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/2-200.jpg")
    ).toBeTruthy();
  });

  test("it skips sizes already created", async () => {
    populateFiles({
      "images/1.jpg": "1.jpg",
      "images/2.jpg": "1.jpg",
      "images/3.png": "4.png"
    });

    // Make empty files at the expected locations of resized files
    fs.mkdirSync("./static/g/images", { recursive: true });
    fs.closeSync(fs.openSync("./static/g/images/1-100.jpg", "w"));
    fs.closeSync(fs.openSync("./static/g/images/2-100.jpg", "w"));
    fs.closeSync(fs.openSync("./static/g/images/3-100.png", "w"));

    const replaceImages = getReplaceImages({
      sizes: [100],
      processFolders: ["images"],
      processFoldersExtensions: ["jpg", "png"],
      processFoldersSizes: true
    });

    await replaceImages(`no tag necessary`);

    expect(fs.statSync("./static/g/images/1-100.jpg").size).toBe(0);
    expect(fs.statSync("./static/g/images/2-100.jpg").size).toBe(0);
    expect(fs.statSync("./static/g/images/3-100.png").size).toBe(0);
  });

  test("by default, it does not create asset sizes as well", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg",
      "recurse/2.jpg": "1.jpg",
      "recurse/3.png": "4.png",
      "recurse/subfolder/1.jpg": "1.jpg",
      "recurse/subfolder/2.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      sizes: [100, 200],
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg", "png"],
      processFoldersRecursively: true
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/recurse/1-100.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/1-200.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2-100.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2-200.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3-100.png")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3-200.png")).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/1-100.jpg")
    ).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/1-200.jpg")
    ).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/2-100.jpg")
    ).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/2-200.jpg")
    ).not.toBeTruthy();
  });

  test("it only runs on the first component parse", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg"]
    });

    await replaceImages(`no tag necessary`);
    expect(fs.existsSync("./static/g/recurse/1.jpg")).toBeTruthy();

    await cleanFiles();
    populateFiles({
      "recurse/1.jpg": "1.jpg"
    });

    expect(fs.existsSync("./static/g/recurse/1.jpg")).not.toBeTruthy();

    await replaceImages(`again, no tag`);
    expect(fs.existsSync("./static/g/recurse/1.jpg")).not.toBeTruthy();
  });

  test("it ignores the inline option", async () => {
    // We need to assume that the user wants all images, even if they fall below
    // the normal inlining limit.

    populateFiles({
      "recurse/1.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg"],
      inlineBelow: Infinity
    });

    await replaceImages(`no tag necessary`);
    expect(fs.existsSync("./static/g/recurse/1.jpg")).toBeTruthy();
  });

  test("it skips images already created", async () => {
    populateFiles({
      "images/1.jpg": "1.jpg",
      "images/2.jpg": "1.jpg",
      "images/3.png": "4.png"
    });

    // Make empty files at the expected locations of resized files
    fs.mkdirSync("./static/g/images", { recursive: true });
    fs.closeSync(fs.openSync("./static/g/images/1.jpg", "w"));
    fs.closeSync(fs.openSync("./static/g/images/2.jpg", "w"));
    fs.closeSync(fs.openSync("./static/g/images/3.png", "w"));

    const replaceImages = getReplaceImages({
      processFolders: ["images"],
      processFoldersExtensions: ["jpg", "png"]
    });

    await replaceImages(`no tag necessary`);

    expect(fs.statSync("./static/g/images/1.jpg").size).toBe(0);
    expect(fs.statSync("./static/g/images/2.jpg").size).toBe(0);
    expect(fs.statSync("./static/g/images/3.png").size).toBe(0);
  });

  test("does not process other folders", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg",
      "recurse/2.jpg": "1.jpg",
      "recurse/3.png": "4.png",
      "recurse/subfolder/1.jpg": "1.jpg",
      "recurse/subfolder/2.jpg": "1.jpg",
      "noRecurse/1.jpg": "1.jpg",
      "noRecurse/2.jpg": "1.jpg",
      "noRecurse/subfolder/1.jpg": "1.jpg",
      "noRecurse/subfolder/2.jpg": "1.jpg"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg", "png"]
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/noRecurse/1.jpg")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/noRecurse/2.jpg")).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/noRecurse/subfolder/1.jpg")
    ).not.toBeTruthy();
    expect(
      fs.existsSync("./static/g/noRecurse/subfolder/2.jpg")
    ).not.toBeTruthy();
  });

  test("it skips images that are not in the extensions list", async () => {
    populateFiles({
      "recurse/1.jpg": "1.jpg",
      "recurse/2.jpg": "1.jpg",
      "recurse/3.png": "4.png",
      "recurse/subfolder/1.jpg": "1.jpg",
      "recurse/subfolder/2.png": "4.png"
    });

    const replaceImages = getReplaceImages({
      processFolders: ["recurse"],
      processFoldersExtensions: ["jpg"],
      processFoldersRecursively: true
    });

    await replaceImages(`no tag necessary`);

    expect(fs.existsSync("./static/g/recurse/1.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/2.jpg")).toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/3.png")).not.toBeTruthy();
    expect(fs.existsSync("./static/g/recurse/subfolder/1.jpg")).toBeTruthy();
    expect(
      fs.existsSync("./static/g/recurse/subfolder/2.png")
    ).not.toBeTruthy();
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
