declare module 'pokersolver' {
  export class Hand {
    rank: number;
    name: string;
    cards: string[];
    descript: string;

    constructor(cards: string[]);

    static solve(cards: string[]): Hand;
    static winners(hands: Hand[]): Hand[];
  }
}
