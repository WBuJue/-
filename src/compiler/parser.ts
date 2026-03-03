import { Token, TokenType, GrammarRule, Action, ParsingStep } from "./types";

export class Parser {
  public actionTable: Map<number, Map<string, Action>> = new Map();
  public gotoTable: Map<number, Map<string, number>> = new Map();
  public rules: GrammarRule[] = [];

  constructor(grammarText: string) {
    this.initializeDefaultGrammar();
  }

  private initializeDefaultGrammar() {
    // E -> E + T | T
    // T -> T * F | F
    // F -> ( E ) | id | num
    this.rules = [
      { left: "E'", right: ["E"] }, // 0: Augmented rule
      { left: "E", right: ["E", "+", "T"] }, // 1
      { left: "E", right: ["T"] }, // 2
      { left: "T", right: ["T", "*", "F"] }, // 3
      { left: "T", right: ["F"] }, // 4
      { left: "F", right: ["(", "E", ")"] }, // 5
      { left: "F", right: ["id"] }, // 6
      { left: "F", right: ["num"] }, // 7
    ];

    // Pre-calculated SLR(1) table for the above grammar (simplified for demo)
    // States: 0-11
    const actions = new Map<number, Map<string, Action>>();
    const gotos = new Map<number, Map<string, number>>();

    const setAction = (state: number, symbol: string, action: Action) => {
      if (!actions.has(state)) actions.set(state, new Map());
      actions.get(state)!.set(symbol, action);
    };

    const setGoto = (state: number, symbol: string, nextState: number) => {
      if (!gotos.has(state)) gotos.set(state, new Map());
      gotos.get(state)!.set(symbol, nextState);
    };

    // State 0
    setAction(0, "id", { type: "SHIFT", value: 5 });
    setAction(0, "num", { type: "SHIFT", value: 5 });
    setAction(0, "(", { type: "SHIFT", value: 4 });
    setGoto(0, "E", 1);
    setGoto(0, "T", 2);
    setGoto(0, "F", 3);

    // State 1
    setAction(1, "+", { type: "SHIFT", value: 6 });
    setAction(1, "$", { type: "ACCEPT" });

    // State 2
    setAction(2, "+", { type: "REDUCE", value: 2 });
    setAction(2, "*", { type: "SHIFT", value: 7 });
    setAction(2, ")", { type: "REDUCE", value: 2 });
    setAction(2, "$", { type: "REDUCE", value: 2 });

    // State 3
    setAction(3, "+", { type: "REDUCE", value: 4 });
    setAction(3, "*", { type: "REDUCE", value: 4 });
    setAction(3, ")", { type: "REDUCE", value: 4 });
    setAction(3, "$", { type: "REDUCE", value: 4 });

    // State 4
    setAction(4, "id", { type: "SHIFT", value: 5 });
    setAction(4, "num", { type: "SHIFT", value: 5 });
    setAction(4, "(", { type: "SHIFT", value: 4 });
    setGoto(4, "E", 8);
    setGoto(4, "T", 2);
    setGoto(4, "F", 3);

    // State 5
    setAction(5, "+", { type: "REDUCE", value: 6 });
    setAction(5, "*", { type: "REDUCE", value: 6 });
    setAction(5, ")", { type: "REDUCE", value: 6 });
    setAction(5, "$", { type: "REDUCE", value: 6 });

    // State 6
    setAction(6, "id", { type: "SHIFT", value: 5 });
    setAction(6, "num", { type: "SHIFT", value: 5 });
    setAction(6, "(", { type: "SHIFT", value: 4 });
    setGoto(6, "T", 9);
    setGoto(6, "F", 3);

    // State 7
    setAction(7, "id", { type: "SHIFT", value: 5 });
    setAction(7, "num", { type: "SHIFT", value: 5 });
    setAction(7, "(", { type: "SHIFT", value: 4 });
    setGoto(7, "F", 10);

    // State 8
    setAction(8, "+", { type: "SHIFT", value: 6 });
    setAction(8, ")", { type: "SHIFT", value: 11 });

    // State 9
    setAction(9, "+", { type: "REDUCE", value: 1 });
    setAction(9, "*", { type: "SHIFT", value: 7 });
    setAction(9, ")", { type: "REDUCE", value: 1 });
    setAction(9, "$", { type: "REDUCE", value: 1 });

    // State 10
    setAction(10, "+", { type: "REDUCE", value: 3 });
    setAction(10, "*", { type: "REDUCE", value: 3 });
    setAction(10, ")", { type: "REDUCE", value: 3 });
    setAction(10, "$", { type: "REDUCE", value: 3 });

    // State 11
    setAction(11, "+", { type: "REDUCE", value: 5 });
    setAction(11, "*", { type: "REDUCE", value: 5 });
    setAction(11, ")", { type: "REDUCE", value: 5 });
    setAction(11, "$", { type: "REDUCE", value: 5 });

    this.actionTable = actions;
    this.gotoTable = gotos;
  }

  parse(tokens: Token[]): { success: boolean; steps: ParsingStep[]; error?: string } {
    const steps: ParsingStep[] = [];
    const stack: number[] = [0];
    const symbols: string[] = ["$"];
    
    // Map tokens to grammar terminals
    const input: string[] = tokens.map(t => {
      if (t.type === TokenType.IDENTIFIER) return "id";
      if (t.type === TokenType.CONSTANT) return "num";
      return t.content;
    }).concat(["$"]);

    let stepCount = 1;
    let i = 0;

    while (true) {
      const state = stack[stack.length - 1];
      const lookahead = input[i];
      const action = this.actionTable.get(state)?.get(lookahead);

      if (!action) {
        return { 
          success: false, 
          steps, 
          error: `Unexpected token '${lookahead}' at state ${state}. Expected one of: ${Array.from(this.actionTable.get(state)?.keys() || []).join(", ")}` 
        };
      }

      if (action.type === "SHIFT") {
        steps.push({
          step: stepCount++,
          stack: [...stack],
          symbols: [...symbols],
          input: input.slice(i),
          action: `Shift to state ${action.value}`
        });
        stack.push(action.value!);
        symbols.push(lookahead);
        i++;
      } else if (action.type === "REDUCE") {
        const rule = this.rules[action.value!];
        steps.push({
          step: stepCount++,
          stack: [...stack],
          symbols: [...symbols],
          input: input.slice(i),
          action: `Reduce by rule ${rule.left} -> ${rule.right.join(" ")}`
        });
        
        // Pop symbols and states
        for (let j = 0; j < rule.right.length; j++) {
          stack.pop();
          symbols.pop();
        }
        
        const prevState = stack[stack.length - 1];
        const nextState = this.gotoTable.get(prevState)?.get(rule.left);
        
        if (nextState === undefined) {
          return { success: false, steps, error: `Goto error: No transition for ${rule.left} from state ${prevState}` };
        }
        
        stack.push(nextState);
        symbols.push(rule.left);
      } else if (action.type === "ACCEPT") {
        steps.push({
          step: stepCount++,
          stack: [...stack],
          symbols: [...symbols],
          input: input.slice(i),
          action: "Accept"
        });
        return { success: true, steps };
      }
    }
  }
}
