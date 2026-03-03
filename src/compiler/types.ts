export enum TokenType {
  KEYWORD = "KEYWORD",
  IDENTIFIER = "IDENTIFIER",
  CONSTANT = "CONSTANT",
  DELIMITER = "DELIMITER",
  OPERATOR = "OPERATOR",
  UNKNOWN = "UNKNOWN",
}

export interface Token {
  line: number;
  type: TokenType;
  content: string;
}

export interface NFAState {
  id: number;
  isAccepting: boolean;
  transitions: Map<string, number[]>; // char -> [stateIds]
}

export interface DFAState {
  id: number;
  isAccepting: boolean;
  nfaStates: Set<number>;
  transitions: Map<string, number>; // char -> stateId
  tokenType?: TokenType;
}

export interface GrammarRule {
  left: string;
  right: string[];
}

export interface LRItem {
  ruleIndex: number;
  dotPosition: number;
  lookahead: Set<string>;
}

export interface LRState {
  id: number;
  items: LRItem[];
  transitions: Map<string, number>;
}

export type ActionType = "SHIFT" | "REDUCE" | "ACCEPT";

export interface Action {
  type: ActionType;
  value?: number; // stateId for SHIFT, ruleIndex for REDUCE
}

export interface ParsingStep {
  step: number;
  stack: number[];
  symbols: string[];
  input: string[];
  action: string;
}
