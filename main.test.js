const fs = require("fs");
const { defaults, replaceImages } = require("./main");
const {cleanFiles, populateFiles} = require('./test/helpers')

beforeEach(cleanFiles);

describe("Extension filtering", () => {
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

    const options = {
      ...defaults,
      imgTagExtensions: ["jpg", "png"],
      componentExtensions: ["jpg"],
      sizes: [200]
    };

    expect(await replaceImages(`<img src="/for/imageTag.jpg">`, options)).toEqual(
      `<img src="g/for/imageTag.jpg">`
    );
    expect(fs.existsSync("./static/g/for/imageTag.jpg")).toBeTruthy();

    expect(await replaceImages(`<img src="/for/imageTag.png">`, options)).toEqual(
      `<img src="g/for/imageTag.png">`
    );
    expect(fs.existsSync("./static/g/for/imageTag.png")).toBeTruthy();

    expect(
      await replaceImages(`<Image src="/using/imageComponent.jpg"/>`, options)
    ).not.toEqual(`<Image src="/using/imageComponent.jpg"/>`);
    expect(fs.existsSync("./static/g/using/imageComponent-200.jpg")).toBeTruthy();

    expect(
      await replaceImages(`<Image src="/using/imageComponent.png"/>`, options)
    ).toEqual(`<Image src="/using/imageComponent.png"/>`);
    expect(fs.existsSync("./static/g/using/imageComponent-200.png")).not.toBeTruthy();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch("imageComponent.png");
  });
});
