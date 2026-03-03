import { TokenType, Token } from "./types";

export class Lexer {
  private keywords = new Set(["if", "else", "while", "for", "int", "float", "double", "return", "void", "complex", "main"]);
  private operators = new Set(["+", "-", "*", "/", "=", "==", "!=", "<", ">", "<=", ">="]);
  private delimiters = new Set(["(", ")", "{", "}", ";", ",", "[", "]"]);

  tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let i = 0;

    while (i < source.length) {
      const char = source[i];

      if (char === "\n") {
        line++;
        i++;
        continue;
      }
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Comments
      if (char === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }

      // Identifiers & Keywords
      if (/[a-zA-Z_]/.test(char)) {
        let content = "";
        while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
          content += source[i];
          i++;
        }
        if (this.keywords.has(content)) {
          tokens.push({ line, type: TokenType.KEYWORD, content });
        } else {
          tokens.push({ line, type: TokenType.IDENTIFIER, content });
        }
        continue;
      }

      // Numbers (Scientific & Complex)
      // We'll use a regex for the complex/scientific part to ensure accuracy as per requirements
      // Scientific: \d+(\.\d+)?([eE][+-]?\d+)?
      // Complex: \d+(\.\d+)?([eE][+-]?\d+)?[+-]\d+(\.\d+)?([eE][+-]?\d+)?i
      const numRegex = /^(\d+(\.\d+)?([eE][+-]?\d+)?([+-]\d+(\.\d+)?([eE][+-]?\d+)?i|i)?)/;
      const match = source.substring(i).match(numRegex);
      if (match) {
        const content = match[0];
        tokens.push({ line, type: TokenType.CONSTANT, content });
        i += content.length;
        continue;
      }

      // Operators (multi-char first)
      const twoCharOp = source.substring(i, i + 2);
      if (this.operators.has(twoCharOp)) {
        tokens.push({ line, type: TokenType.OPERATOR, content: twoCharOp });
        i += 2;
        continue;
      }
      if (this.operators.has(char)) {
        tokens.push({ line, type: TokenType.OPERATOR, content: char });
        i++;
        continue;
      }

      // Delimiters
      if (this.delimiters.has(char)) {
        tokens.push({ line, type: TokenType.DELIMITER, content: char });
        i++;
        continue;
      }

      // Unknown
      tokens.push({ line, type: TokenType.UNKNOWN, content: char });
      i++;
    }

    return tokens;
  }
}
