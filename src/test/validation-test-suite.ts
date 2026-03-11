// Shape validation test suite
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ShapeConverterService } from "../services/shape-converter";
import type { MCPShape } from "../types";

/**
 * Test suite for shape validation and AI input sanitization
 */
export class ValidationTestSuite {
  private converter = new ShapeConverterService();
  private testResults: Array<{
    test: string;
    passed: boolean;
    details: string;
  }> = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async runAllTests(): Promise<void> {
    console.log("Starting validation tests...");

    this.testValidShapes();
    this.testInvalidColors();
    this.testInvalidProperties();
    this.testInvalidShapeTypes();
    this.testInvalidCoordinates();
    this.testInvalidProps();
    this.testTextConversion();
    this.testArrowValidation();
    this.testBatchProcessing();
    this.testErrorRecovery();

    this.printResults();
  }

  private testValidShapes(): void {
    console.log("Testing valid shapes...");

    const validShapes = [
      {
        id: "shape:test1",
        type: "geo",
        typeName: "shape",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          geo: "rectangle",
          w: 150,
          h: 100,
          color: "blue",
          fill: "semi",
        },
      },
      {
        id: "shape:test2",
        type: "text",
        typeName: "shape",
        x: 200,
        y: 50,
        rotation: 0,
        index: "a2",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        meta: {},
        props: { text: "Hello World", color: "red", size: "l" },
      },
      {
        id: "shape:test3",
        type: "arrow",
        typeName: "shape",
        x: 0,
        y: 0,
        rotation: 0,
        index: "a3",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          start: { x: 50, y: 50 },
          end: { x: 200, y: 150 },
          color: "green",
          arrowheadEnd: "arrow",
        },
      },
    ] as unknown as MCPShape[];

    try {
      const converted = this.converter.toTldrawShapes(validShapes);
      this.addResult(
        "Valid shapes conversion",
        converted.length === 3,
        `Converted ${String(converted.length)}/3 valid shapes`,
      );
    } catch (error: unknown) {
      this.addResult("Valid shapes conversion", false, `Error: ${String(error)}`);
    }
  }

  private testInvalidColors(): void {
    console.log("Testing invalid colors...");

    const invalidColorShapes = [
      { color: "crimson", expected: "red" },
      { color: "purple", expected: "violet" },
      { color: "#ff0000", expected: "black" },
      { color: "rgb(255,0,0)", expected: "black" },
      { color: 123, expected: "black" },
      { color: null, expected: "black" },
      { color: undefined, expected: "black" },
    ];

    invalidColorShapes.forEach(({ color, expected }) => {
      try {
        const shape = {
          id: `test-color-${Date.now()}`,
          type: "geo",
          typeName: "shape",
          x: 100,
          y: 100,
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props: { color, geo: "rectangle", w: 100, h: 100 },
        } as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const actualColor = (converted.props as any).color;

        this.addResult(
          `Color mapping: ${String(color)} → ${expected}`,
          actualColor === expected,
          `Got: ${String(actualColor)}, Expected: ${expected}`,
        );
      } catch (error: unknown) {
        this.addResult(`Color mapping: ${String(color)}`, false, `Error: ${String(error)}`);
      }
    });
  }

  private testInvalidProperties(): void {
    console.log("Testing invalid properties...");

    const invalidPropTests = [
      {
        name: "Invalid width/height",
        shape: { type: "geo", props: { w: "not-a-number", h: -50 } },
        expected: "Should clamp to valid ranges",
      },
      {
        name: "Invalid geo type",
        shape: { type: "geo", props: { geo: "invalid-shape" } },
        expected: "Should fallback to rectangle",
      },
      {
        name: "Invalid fill type",
        shape: { type: "geo", props: { fill: "gradient" } },
        expected: "Should fallback to none",
      },
      {
        name: "Invalid coordinates",
        shape: { type: "geo", x: "invalid", y: null },
        expected: "Should use safe defaults",
      },
    ];

    invalidPropTests.forEach(({ name, shape, expected }) => {
      try {
        const testShape: MCPShape = {
          id: `test-${Date.now()}`,
          typeName: "shape",
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          ...shape,
          x: (shape as any).x ?? 100,
          y: (shape as any).y ?? 100,
        } as MCPShape;

        const converted = this.converter.toTldrawShape(testShape);
        const hasValidProps = this.validateShapeProps(converted);

        this.addResult(name, hasValidProps, expected);
      } catch (error: unknown) {
        this.addResult(name, false, `Error: ${String(error)}`);
      }
    });
  }

  /**
   * Test invalid shape types
   */
  private testInvalidShapeTypes(): void {
    console.log("Testing invalid shape types...");

    const invalidTypes = ["rectangle", "circle", "box", "triangle", null, undefined, 123];

    invalidTypes.forEach((type) => {
      try {
        const shape = {
          id: `test-type-${Date.now()}`,
          type: type as any,
          typeName: "shape",
          x: 100,
          y: 100,
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props: {},
        } as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const isValidType = [
          "geo",
          "text",
          "arrow",
          "draw",
          "highlight",
          "image",
          "video",
          "embed",
          "bookmark",
          "frame",
          "note",
          "line",
          "group",
        ].includes(converted.type);

        this.addResult(
          `Invalid type: ${String(type)}`,
          isValidType,
          `Converted to: ${converted.type}`,
        );
      } catch (error: unknown) {
        this.addResult(`Invalid type: ${String(type)}`, false, `Error: ${String(error)}`);
      }
    });
  }

  /**
   * Test invalid coordinates handling
   */
  private testInvalidCoordinates(): void {
    console.log("Testing invalid coordinates...");

    const invalidCoords = [
      { x: null, y: undefined },
      { x: "invalid", y: "also-invalid" },
      { x: Infinity, y: -Infinity },
      { x: NaN, y: NaN },
      { x: 99999, y: -99999 },
    ];

    invalidCoords.forEach((coords, index) => {
      try {
        const shape: MCPShape = {
          id: `test-coords-${String(index)}`,
          type: "geo",
          typeName: "shape",
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props: {},
          ...coords,
        } as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const hasValidCoords =
          typeof converted.x === "number" &&
          typeof converted.y === "number" &&
          isFinite(converted.x) &&
          isFinite(converted.y) &&
          converted.x >= -10000 &&
          converted.x <= 10000 &&
          converted.y >= -10000 &&
          converted.y <= 10000;

        this.addResult(
          `Invalid coords: ${JSON.stringify(coords)}`,
          hasValidCoords,
          `Result: x=${String(converted.x)}, y=${String(converted.y)}`,
        );
      } catch (error: unknown) {
        this.addResult(
          `Invalid coords: ${JSON.stringify(coords)}`,
          false,
          `Error: ${String(error)}`,
        );
      }
    });
  }

  /**
   * Test props object validation
   */
  private testInvalidProps(): void {
    console.log("Testing invalid props objects...");

    const invalidProps = [
      null,
      undefined,
      "string-instead-of-object",
      123,
      [],
      { invalidProp: "shouldBeRemoved", anotherBad: 999 },
    ];

    invalidProps.forEach((props, index) => {
      try {
        const shape = {
          id: `test-props-${String(index)}`,
          type: "geo",
          typeName: "shape",
          x: 100,
          y: 100,
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props: props as any,
        } as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const hasValidProps = (converted.props as unknown) != null && typeof converted.props === "object";

        this.addResult(
          `Invalid props: ${typeof props}`,
          hasValidProps,
          `Result: ${JSON.stringify(converted.props)}`,
        );
      } catch (error: unknown) {
        this.addResult(`Invalid props: ${typeof props}`, false, `Error: ${String(error)}`);
      }
    });
  }

  /**
   * Test text to richText conversion
   */
  private testTextConversion(): void {
    console.log("Testing text conversion...");

    const textTests = [
      { text: "Hello World", expected: "Should create richText" },
      { text: "", expected: "Should handle empty text" },
      { text: null, expected: "Should handle null text" },
      {
        richText: { type: "doc", content: [] },
        expected: "Should preserve richText",
      },
    ];

    textTests.forEach(({ text, richText, expected }) => {
      try {
        const shape = {
          id: `test-text-${Date.now()}`,
          type: "text",
          typeName: "shape",
          x: 100,
          y: 100,
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props: richText ? { richText } : { text },
        } as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const hasRichText =
          (converted.props as any).richText?.type === "doc";

        this.addResult(`Text conversion: ${text ?? "richText"}`, hasRichText, expected);
      } catch (error: unknown) {
        this.addResult(`Text conversion: ${String(text)}`, false, `Error: ${String(error)}`);
      }
    });
  }

  /**
   * Test arrow validation
   */
  private testArrowValidation(): void {
    console.log("Testing arrow validation...");

    const arrowTests = [
      {
        name: "Valid arrow points",
        props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
        expected: true,
      },
      {
        name: "Invalid arrow points",
        props: { start: "invalid", end: null },
        expected: true, // Should fallback to defaults
      },
      {
        name: "Invalid arrowheads",
        props: { arrowheadStart: "invalid", arrowheadEnd: "also-invalid" },
        expected: true, // Should fallback to valid values
      },
    ];

    arrowTests.forEach(({ name, props, expected }) => {
      try {
        const shape = {
          id: `test-arrow-${Date.now()}`,
          type: "arrow",
          typeName: "shape",
          x: 0,
          y: 0,
          rotation: 0,
          index: "a1",
          parentId: "page:page",
          isLocked: false,
          opacity: 1,
          meta: {},
          props,
        } as unknown as MCPShape;

        const converted = this.converter.toTldrawShape(shape);
        const hasValidArrow =
          (converted.props as any).start &&
          (converted.props as any).end &&
          typeof (converted.props as any).start.x === "number";

        this.addResult(
          name,
          hasValidArrow === expected,
          `Arrow props: ${JSON.stringify(converted.props, null, 2)}`,
        );
      } catch (error: unknown) {
        this.addResult(name, false, `Error: ${String(error)}`);
      }
    });
  }

  /**
   * Test batch processing
   */
  private testBatchProcessing(): void {
    console.log("Testing batch processing...");

    // Mix of valid and invalid shapes
    const mixedShapes: any[] = [
      { type: "geo", x: 100, y: 100, props: { color: "blue" } },
      { type: "invalid-type", x: "invalid", y: null, props: null },
      { type: "text", x: 200, y: 200, props: { text: "Test" } },
      null,
      undefined,
      "invalid-shape",
      { type: "arrow", x: 300, y: 300, props: { color: "purple" } },
    ];

    try {
      const converted = this.converter.toTldrawShapes(mixedShapes as MCPShape[]);
      const hasResults = converted.length > 0;

      this.addResult(
        "Batch processing with mixed inputs",
        hasResults,
        `Processed ${String(converted.length)} shapes from ${String(mixedShapes.length)} inputs`,
      );
    } catch (error: unknown) {
      this.addResult("Batch processing", false, `Error: ${String(error)}`);
    }
  }

  /**
   * Test error recovery
   */
  private testErrorRecovery(): void {
    console.log("Testing error recovery...");

    // Test completely malformed shape
    const malformedShape = {
      // Missing required fields
      props: {
        // Invalid everything
        color: { nested: "object" },
        size: ["array", "instead", "of", "string"],
        w: { not: "a number" },
      },
    };

    try {
      const converted = this.converter.toTldrawShape(malformedShape as any);
      const isValidFallback =
        converted.type === "geo" &&
        typeof converted.x === "number" &&
        typeof converted.y === "number";

      this.addResult(
        "Error recovery fallback",
        isValidFallback,
        `Created fallback: ${converted.type} at (${String(converted.x)}, ${String(converted.y)})`,
      );
    } catch (error: unknown) {
      this.addResult("Error recovery", false, `Failed to recover: ${String(error)}`);
    }
  }

  /**
   * Validate that shape props are safe for Tldraw
   */
  private validateShapeProps(shape: any): boolean {
    if (!shape?.props) return false;

    // Basic validation - props should be an object
    if (typeof shape.props !== "object") return false;

    // Check that numeric props are actually numbers
    const numericProps = [
      "w",
      "h",
      "x",
      "y",
      "rotation",
      "opacity",
      "bend",
      "scale",
      "time",
      "growY",
    ];
    for (const prop of numericProps) {
      if (
        shape.props[prop] !== undefined &&
        (typeof shape.props[prop] !== "number" || !isFinite(shape.props[prop]))
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add test result
   */
  private addResult(test: string, passed: boolean, details: string): void {
    this.testResults.push({ test, passed, details });
    const status = passed ? "" : "";
    console.log(`  ${status} ${test}: ${details}`);
  }

  /**
   * Print final test results
   */
  private printResults(): void {
    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;

    console.log(`\nResults: ${String(passed)}/${String(total)} passed`);

    if (passed === total) {
      console.log("All tests passed.");
    } else {
      console.log("Some tests failed.");

      const failed = this.testResults.filter((r) => !r.passed);
      console.log("\n Failed tests:");
      failed.forEach(({ test, details }) => {
        console.log(`  • ${test}: ${details}`);
      });
    }
  }

  /**
   * Get test summary
   */
  getTestSummary(): { passed: number; total: number; success: boolean } {
    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;
    return { passed, total, success: passed === total };
  }
}

// Usage example:
export async function runValidationTests(): Promise<void> {
  const testSuite = new ValidationTestSuite();
  await testSuite.runAllTests();

  const summary = testSuite.getTestSummary();
  if (summary.success) {
    console.log("Validation system ready.");
  } else {
    console.log("Validation needs fixes.");
  }
}
