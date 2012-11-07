/// <reference path="libs/jquery.ts" />

class Cell {
  constructor(public kind:string) {
    this.$elem = $('<div class="cell"></div>');
  }
}

class CellGrid {
  cells: Cell[];
  constructor(public name:string, elem:string) {
    this.$elem = $(elem);
  }
}

class Body {
  grids: CellGrid[];
}
