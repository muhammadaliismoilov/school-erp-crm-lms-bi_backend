export enum InventoryItemStatus {
  ACTIVE = 'active',
  IN_REPAIR = 'in_repair',
  WRITTEN_OFF = 'written_off',
}

export enum InventoryTransactionType {
  INCOME = 'income',
  ISSUE = 'issue',
  RETURN = 'return',
  WRITE_OFF = 'write_off',
  ADJUSTMENT = 'adjustment',
}
