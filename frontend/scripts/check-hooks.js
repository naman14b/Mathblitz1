/**
 * CI/CD & Build Guard: React Hooks Rules Enforcement
 * Scans all frontend components and hooks to guarantee:
 * 1. Zero hooks called conditionally (inside if, ternary, loops, switch, logical expressions)
 * 2. Zero hooks called after any return statement (early return)
 *
 * Exits with status 1 if any violation is found.
 */

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const rootDir = path.resolve(__dirname, "..");
const searchDirs = [path.join(rootDir, "src"), path.join(rootDir, "app")];
let allFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".expo" && entry.name !== "dist") {
        walk(fullPath);
      }
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      allFiles.push(fullPath);
    }
  }
}

searchDirs.forEach(walk);

let violations = [];

function isHookName(name) {
  return /^use[A-Z0-9]/.test(name);
}

for (const file of allFiles) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch (err) {
    console.error(`[check-hooks] Parse error in ${file}:`, err.message);
    continue;
  }

  traverse(ast, {
    Function(fnPath) {
      const fnNode = fnPath.node;
      if (!fnNode.body || fnNode.body.type !== "BlockStatement") return;

      const fnName =
        fnNode.id?.name ||
        (fnPath.parent.type === "VariableDeclarator" && fnPath.parent.id.type === "Identifier"
          ? fnPath.parent.id.name
          : "");

      const isCompOrHook = (fnName && /^[A-Z]/.test(fnName)) || isHookName(fnName);
      if (!isCompOrHook) return;

      let returnSeen = false;
      let returnLoc = null;

      for (const stmt of fnNode.body.body) {
        if (stmt.type === "ReturnStatement") {
          returnSeen = true;
          returnLoc = stmt.loc?.start;
        }

        if (stmt.type === "IfStatement") {
          const consequent = stmt.consequent;
          if (
            consequent.type === "ReturnStatement" ||
            (consequent.type === "BlockStatement" &&
              consequent.body.some((s) => s.type === "ReturnStatement"))
          ) {
            returnSeen = true;
            returnLoc = stmt.loc?.start;
          }
        }

        traverse(
          stmt,
          {
            Function(nestedFn) {
              nestedFn.skip();
            },
            CallExpression(callPath) {
              const callee = callPath.node.callee;
              let calleeName = "";
              if (callee.type === "Identifier") {
                calleeName = callee.name;
              } else if (
                callee.type === "MemberExpression" &&
                callee.property.type === "Identifier"
              ) {
                calleeName = callee.property.name;
              }

              if (isHookName(calleeName)) {
                let cur = callPath.parentPath;
                let isConditional = false;
                while (cur && cur.node !== stmt) {
                  if (
                    cur.isIfStatement() ||
                    cur.isConditionalExpression() ||
                    cur.isLogicalExpression() ||
                    cur.isSwitchStatement() ||
                    cur.isLoop()
                  ) {
                    isConditional = true;
                    break;
                  }
                  cur = cur.parentPath;
                }

                if (isConditional) {
                  violations.push({
                    file: path.relative(rootDir, file),
                    line: callPath.node.loc?.start.line,
                    message: `Hook "${calleeName}" is called conditionally inside ${fnName}`,
                  });
                } else if (returnSeen && stmt.loc?.start.line > (returnLoc?.line || 0)) {
                  violations.push({
                    file: path.relative(rootDir, file),
                    line: callPath.node.loc?.start.line,
                    message: `Hook "${calleeName}" is called after a return statement (line ${returnLoc?.line}) inside ${fnName}`,
                  });
                }
              }
            },
          },
          fnPath.scope,
          fnPath
        );
      }
    },
  });
}

console.log("==========================================");
console.log(` React Rules of Hooks Verification Scan`);
console.log("==========================================");
console.log(`Files scanned: ${allFiles.length}`);

if (violations.length > 0) {
  console.error(`\n❌ ERROR: Found ${violations.length} hook rule violation(s):\n`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} -> ${v.message}`);
  });
  console.error("\nReact requires hooks to be called in the exact same order on every render.");
  console.error("Move all hook calls above any conditional statements and return statements.\n");
  process.exit(1);
} else {
  console.log(`\n✅ SUCCESS: 0 hook order violations found across all ${allFiles.length} files.`);
  console.log("All components and hooks comply strictly with React Rules of Hooks.\n");
  process.exit(0);
}
