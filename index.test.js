const getPreprocessor = require("./index");

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
