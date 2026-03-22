
export interface UnitStats {
  hp: number;
  maxHp: number;
  attack: number;
}

export type UnitTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface UnitTemplate {
  id: string; // e.g., 'bulbasaur'
  name: string;
  tier: UnitTier;
  baseStats: UnitStats;
  imageUrl: string;
  battleImageUrl?: string; // New field
  evolveId?: string; // ID of the unit this evolves into
  description: string;
  synergies: string[]; // e.g., ['Starter', 'Normal']
  isHiddenFromShop?: boolean; // If true, this unit cannot appear in the shop
  family?: string; // Family ID for synergy grouping
  abilityPower?: number; // Optional power value for specific abilities
}

export class Unit {
  public id: string; // Instance ID
  public templateId: string;
  public name: string;
  public level: number = 1;
  public exp: number = 1;
  public stats: UnitStats;
  public tier: UnitTier;
  public imageUrl: string;
  public battleImageUrl?: string; // New field
  public evolveId?: string;
  public synergies: string[];
  public family: string;
  public scalingValue: number = 1;
  public abilityPower: number = 0;
  public battlesCount: number = 0;
  public hasNewPermanentBuff: boolean = false;

  constructor(template: UnitTemplate) {
    this.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    this.templateId = template.id;
    this.name = template.name;
    this.tier = template.tier;
    this.stats = { ...template.baseStats };
    this.imageUrl = template.imageUrl;
    this.battleImageUrl = template.battleImageUrl;
    this.evolveId = template.evolveId;
    this.synergies = template.synergies || [];
    this.family = template.family || template.id;
    this.abilityPower = template.abilityPower || 0;
    this._descriptionTemplate = template.description;
  }

  private _descriptionTemplate: string;

  public get description(): string {
    let desc = this._descriptionTemplate;

    // 1. Replace "N*Lv" with calculated value
    desc = desc.replace(/(\d+)\*Lv/g, (_, n) => (parseInt(n) * this.level).toString());

    // 2. Replace remaining "Lv" with current level
    desc = desc.replace(/Lv/g, this.level.toString());

    // 3. Replace [N] with scalingValue
    desc = desc.replace(/\[N\]/g, this.scalingValue.toString());

    // 4. Remove brackets [] from tags
    desc = desc.replace(/\[(.*?)\]/g, '$1');

    return desc;
  }

  public set description(value: string) {
    this._descriptionTemplate = value;
  }


  // Max stats according to rules: 50/50
  public capStats() {
    // 1. Cap Max Values (Floor at 1)
    if (this.stats.maxHp > 50) this.stats.maxHp = 50;
    if (this.stats.maxHp < 1) this.stats.maxHp = 1;

    if (this.stats.attack > 50) this.stats.attack = 50;
    if (this.stats.attack < 1) this.stats.attack = 1;

    // 2. Cap Current HP to Max HP (Floor at 1)
    if (this.stats.hp > this.stats.maxHp) this.stats.hp = this.stats.maxHp;
    if (this.stats.hp < 1) this.stats.hp = 1;
  }

  // Helper for Permanent/Temporary Growth (MaxHP + HP + Atk)
  public addGrowth(hp: number, attack: number) {
    // Growth logic: Increases both MaxHP and current HP
    // If unit is at 50/50 Max, it stays at 50/50.
    // If unit is at 40/50 (damaged), addGrowth(2, 0) brings it to 42/50 (Healing).
    this.stats.maxHp += hp;
    this.stats.hp += hp;
    this.stats.attack += attack;
    this.capStats();
  }

  // Helper for Attack Buff
  public addBuff(attack: number) {
    this.stats.attack += attack;
    this.capStats();
  }

  public addExp(_amount: number): boolean {
    // Level logic handled by GameLoop merge
    return false;
  }

  // Merge logic: Highest + (SecondHighest * 0.5) + 1
  public static mergeStats(main: Unit, sacrifice: Unit): UnitStats {
    // Rule: "取最高值 + (次高值 * 0.5) + 1"

    // Handle HP
    const mpHp = main.stats.maxHp;
    const spHp = sacrifice.stats.maxHp;
    const highestHp = Math.max(mpHp, spHp);
    const secondHp = Math.min(mpHp, spHp);
    const newMaxHp = Math.floor(highestHp + secondHp * 0.5);

    // Handle Attack
    const mpAtk = main.stats.attack;
    const spAtk = sacrifice.stats.attack;
    const highestAtk = Math.max(mpAtk, spAtk);
    const secondAtk = Math.min(mpAtk, spAtk);
    const newAtk = Math.floor(highestAtk + secondAtk * 0.5);

    // Feature: Cap stats at 50/50
    const finalHp = Math.min(50, newMaxHp);
    const finalAtk = Math.min(50, newAtk);

    return {
      hp: finalHp,
      maxHp: finalHp,
      attack: finalAtk
    };
  }
}
