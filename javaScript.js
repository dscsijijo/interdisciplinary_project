document.addEventListener('DOMContentLoaded', () => {
    let MQ = MathQuill.getInterface(2);

    let mathFieldSpan = document.getElementById('math-field');
    let latexSpan = document.getElementById('latex-output');
    let mathField = MQ.MathField(mathFieldSpan, {
        handlers: {
            edit: function () {
                let enteredMath = mathField.latex();
                latexSpan.textContent = enteredMath;
            }
        }
    });
    MQ.MathField(document.getElementById('math-field'), {autoCommands: 'sin'});
});
function enter() {
    let mathFieldSpan = document.getElementById('math-field');
    // var resultDisplay = document.getElementById('result');
    let enteredMath = document.getElementById('latex-output').textContent;
    const exp = parse(enteredMath);
    console.log(JSON.stringify(exp, null, 2));
    // var result = calculate(enteredMath);
    // resultDisplay.textContent = result;
}
function split(input) {
    const regex = /\s*(\d+(?:\.\d+)?|[a-zA-Z]+|[+\-*\/^{}]|(\\frac)|(\\left\()|(\\right\))|(\\cdot))/gy;
    const exp = [];
    let position = 0;

    while (position < input.length) {
        regex.lastIndex = position;
        const match = regex.exec(input);

        if (!match) {
            throw new Error("Invalid character at position " + position);
        }

        exp.push(match[1]);
        position = regex.lastIndex;
    }

    return exp;
}
function parse(input) {
    const exp = split(input);
    exp.forEach((value,index) => {console.log(`${index}:${value}`)});
    let pos = 0;

    function peek() {
        return exp[pos];
    }

    function consume() {
        return exp[pos++];
    }

    function expression(minPrecedence = 0) {
        let left;
        const current = consume();

        if (!isNaN(current)) {
            left = { type: "num", value: Number(current) };
        }

        else if (current === "-") {
            left = {
                type: "bin",
                op: "*",
                left: { type: "num", value: -1 },
                right: expression(3)
            };
        }
        else if (/^[a-zA-Z]+$/.test(current)) {
            if (peek() === "\\left(") {
                consume();

                const arg = expression();

                if (consume() !== "\\right)") {
                    throw new Error("Missing closing parenthesis");
                }

                left = { type: "func", name: current, arg };
            } else {
                left = { type: "var", name: current };
            }
        } else if (current === "\\left(") {
            left = expression();
            if (consume() !== "\\right)") {
                throw new Error("Missing closing parenthesis");
            }
        }
        else if (current === "\\left{") {
            left = expression();
            if (consume() !== "\\right}") {
                throw new Error("Missing closing parenthesis");
            }
        }
        else if (current === "\\frac") {
            if (consume() !== "{") {
                throw new Error("Expected '{' after \\frac");
            }
            const numerator = expression();
            if (consume() !== "}") {
                throw new Error("Expected '}' after numerator");
            }
            if (consume() !== "{") {
                throw new Error("Expected '{' before denominator");
            }
            const denominator = expression();
            if (consume() !== "}") {
                throw new Error("Expected '}' after denominator");
            }
            left = { type: "frac", numerator, denominator };
        }
        else {
            throw new Error("Unexpected exp: " + current);
        }
        const precedence = {
            "+": 1,
            "-": 1,
            "\\cdot": 2,
            "^": 4
        };

        while (peek() && precedence[peek()] >= minPrecedence) {
            const op = consume();
            const p = precedence[op];

            const nextMin = op === "^" ? p : p + 1;

            const right = expression(nextMin);

            left = {
                type: "bin",
                op,
                left,
                right
            };
        }

        return left;
    }

    const result = expression();

    if (pos !== exp.length) {
        throw new Error("Unexpected exp: " + peek());
    }

    return result;
}
//
//–––––
//
function differentiate(node, variable = "x") {
    const zero = () => ({ type: "num", value: 0 });
    const one = () => ({ type: "num", value: 1 });

    if (node.type === "num") {
        return zero();
    }

    if (node.type === "var") {
        return node.name === variable ? one() : zero();
    }

    if (node.type === "bin") {
        const u = node.left;
        const v = node.right;

        const du = differentiate(u, variable);
        const dv = differentiate(v, variable);

        switch (node.op) {
            // Sum rule
            case "+":
                return bin("+", du, dv);

            // Difference rule
            case "-":
                return bin("-", du, dv);

            // Product rule: (uv)' = u'v + uv'
            case "*":
                return bin("+",
                    bin("*", du, v),
                    bin("*", u, dv)
                );

            // Quotient rule: (u/v)' = (u'v - uv') / v²
            case "/":
                return bin("/",
                    bin("-",
                        bin("*", du, v),
                        bin("*", u, dv)
                    ),
                    bin("^", v, { type: "num", value: 2 })
                );

            // Power rule for constant exponents
            case "^":
                if (v.type === "num") {
                    return bin("*",
                        bin("*",
                            { type: "num", value: v.value },
                            bin("^", u, {
                                type: "num",
                                value: v.value - 1
                            })
                        ),
                        du
                    );
                }

                // General power rule:
                // (u^v)' = u^v * (v' ln(u) + v*u'/u)
                return bin("*",
                    node,
                    bin("+",
                        bin("*", dv, func("ln", u)),
                        bin("*", v, bin("/", du, u))
                    )
                );
        }
    }

    if (node.type === "func") {
        const u = node.arg;
        const du = differentiate(u, variable);

        switch (node.name) {
            case "sin":
                return bin("*", func("cos", u), du);

            case "cos":
                return bin("*",
                    bin("*",
                        { type: "num", value: -1 },
                        func("sin", u)
                    ),
                    du
                );

            case "tan":
                return bin("/",
                    du,
                    bin("^", func("cos", u), {
                        type: "num", value: 2
                    })
                );

            case "ln":
                return bin("/", du, u);

            case "exp":
                return bin("*", func("exp", u), du);

            case "sqrt":
                return bin("/",
                    du,
                    bin("*",
                        { type: "num", value: 2 },
                        func("sqrt", u)
                    )
                );

            default:
                throw new Error("Unsupported function: " + node.name);
        }
    }
}

// 4. HELPER FUNCTIONS
function bin(op, left, right) {
    return { type: "bin", op, left, right };
}

function func(name, arg) {
    return { type: "func", name, arg };
}

// 5. SIMPLIFICATION
function simplify(node) {
    if (node.type === "num" || node.type === "var") {
        return node;
    }

    if (node.type === "func") {
        return {
            ...node,
            arg: simplify(node.arg)
        };
    }

    let left = simplify(node.left);
    let right = simplify(node.right);

    const isNum = n => n.type === "num";
    const value = n => n.value;

    // Constant folding
    if (isNum(left) && isNum(right)) {
        switch (node.op) {
            case "+": return { type: "num", value: value(left) + value(right) };
            case "-": return { type: "num", value: value(left) - value(right) };
            case "*": return { type: "num", value: value(left) * value(right) };
            case "/":
                if (value(right) !== 0) {
                    return { type: "num", value: value(left) / value(right) };
                }
                break;
            case "^": return { type: "num", value: value(left) ** value(right) };
        }
    }

    // Identity rules
    if (node.op === "+") {
        if (isNum(left) && value(left) === 0) return right;
        if (isNum(right) && value(right) === 0) return left;
    }

    if (node.op === "-") {
        if (isNum(right) && value(right) === 0) return left;
        if (isNum(left) && value(left) === 0) {
            return simplify(bin("*",
                { type: "num", value: -1 }, right));
        }
    }

    if (node.op === "*") {
        if ((isNum(left) && value(left) === 0) ||
            (isNum(right) && value(right) === 0)) {
            return { type: "num", value: 0 };
        }
        if (isNum(left) && value(left) === 1) return right;
        if (isNum(right) && value(right) === 1) return left;
    }

    if (node.op === "/") {
        if (isNum(left) && value(left) === 0) {
            return { type: "num", value: 0 };
        }
        if (isNum(right) && value(right) === 1) return left;
    }

    if (node.op === "^") {
        if (isNum(right) && value(right) === 0) {
            return { type: "num", value: 1 };
        }
        if (isNum(right) && value(right) === 1) return left;
    }

    return { type: "bin", op: node.op, left, right };
}

// 6. CONVERT EXPRESSION TREE BACK INTO MATHEMATICAL TEXT
function toString(node, parentPrecedence = 0) {
    if (node.type === "num") {
        return String(Number(node.value.toFixed(10)));
    }

    if (node.type === "var") {
        return node.name;
    }

    if (node.type === "func") {
        return `${node.name}(${toString(node.arg)})`;
    }

    const precedence = {
        "+": 1,
        "-": 1,
        "*": 2,
        "/": 2,
        "^": 4
    };

    const p = precedence[node.op];

    const left = toString(node.left, p);
    const right = toString(
        node.right,
        p + (node.op === "^" ? -1 : 1)
    );

    let result = `${left} ${node.op} ${right}`;

    if (p < parentPrecedence) {
        result = `(${result})`;
    }

    return result;
}

// 7. MAIN FUNCTION
function symbolicDifferentiate(input, variable = "x") {
    const tree = parse(input);
    const derivative = differentiate(tree, variable);
    const simplified = simplify(derivative);

    return toString(simplified);
}