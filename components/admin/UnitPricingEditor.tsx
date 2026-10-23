import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { COLORS } from '@/lib/theme';
import { formatPrice } from '@/utils/formatPrice';
import { getProductUnits, Product, SaleUnit, SALE_UNITS, UNIT_LABELS } from '@/types/models';
import type { ProductUnitInput } from '@/services/productService';

// Admin editor for a product's selling units: each unit (piece / kg / carton /
// tin) has its own price, optional sale price with an optional end date,
// minimum quantity and, for cartons and tins, how many pieces are inside.

export interface UnitDraft {
  unit: SaleUnit;
  enabled: boolean;
  price: string;
  sale_price: string;
  /** YYYY-MM-DD; the sale runs to the end of that day. Empty = no end date. */
  sale_ends_on: string;
  min_qty: string;
  pieces_per_unit: string;
  is_default: boolean;
}

const HAS_CONTENTS: SaleUnit[] = ['carton', 'tin'];

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Drafts for all four units, filled from the product's units (or empty for a new product). */
export function unitsToDrafts(product?: Product | null): UnitDraft[] {
  const units = product ? getProductUnits(product) : [];
  return SALE_UNITS.map((unit) => {
    const u = units.find((x) => x.unit === unit);
    return {
      unit,
      enabled: !!u,
      price: u ? String(u.price) : '',
      sale_price: u?.sale_price != null ? String(u.sale_price) : '',
      sale_ends_on: toDateInput(u?.sale_ends_at ?? null),
      min_qty: u ? String(u.min_qty) : '1',
      pieces_per_unit: u?.pieces_per_unit != null ? String(u.pieces_per_unit) : '',
      is_default: !!u?.is_default,
    };
  });
}

const num = (v: string) => parseFloat(v.replace(',', '.'));

/** Check the drafts; returns the RPC payload or the first problem in Arabic. */
export function validateUnitDrafts(drafts: UnitDraft[]): { units?: ProductUnitInput[]; error?: string } {
  const enabled = drafts.filter((d) => d.enabled);
  if (!enabled.length) return { error: 'فعّل وحدة بيع واحدة على الأقل وأدخل سعرها.' };

  const units: ProductUnitInput[] = [];
  for (const d of enabled) {
    const label = UNIT_LABELS[d.unit];
    const price = num(d.price);
    if (!(price > 0)) return { error: `أدخل سعراً صحيحاً لـ${label}.` };

    let sale: number | null = null;
    let endsAt: string | null = null;
    if (d.sale_price.trim()) {
      sale = num(d.sale_price);
      if (!(sale > 0)) return { error: `سعر العرض لـ${label} غير صحيح.` };
      if (sale >= price) return { error: `سعر العرض لـ${label} يجب أن يكون أقل من سعره (${formatPrice(price)}).` };
      if (d.sale_ends_on.trim()) {
        const m = d.sale_ends_on.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const end = m ? new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59) : null;
        if (!end || isNaN(end.getTime())) return { error: `تاريخ انتهاء العرض لـ${label} يجب أن يكون بالشكل 2026-12-31.` };
        if (end.getTime() < Date.now()) return { error: `تاريخ انتهاء العرض لـ${label} مضى. اتركه فارغاً أو اختر تاريخاً قادماً.` };
        endsAt = end.toISOString();
      }
    }

    const minQty = d.min_qty.trim() ? parseInt(d.min_qty, 10) : 1;
    if (!(minQty >= 1)) return { error: `أقل كمية لـ${label} يجب أن تكون 1 أو أكثر.` };

    let pieces: number | null = null;
    if (HAS_CONTENTS.includes(d.unit) && d.pieces_per_unit.trim()) {
      pieces = parseInt(d.pieces_per_unit, 10);
      if (!(pieces >= 1)) return { error: `عدد الحبات في ${label} يجب أن يكون 1 أو أكثر.` };
    }

    units.push({ unit: d.unit, price, sale_price: sale, sale_ends_at: endsAt, min_qty: minQty, pieces_per_unit: pieces, is_default: d.is_default });
  }
  // Exactly one default: keep the chosen one, otherwise the first enabled unit.
  if (units.filter((u) => u.is_default).length !== 1) {
    units.forEach((u, i) => { u.is_default = i === 0; });
  }
  units.sort((a, b) => Number(b.is_default) - Number(a.is_default));
  return { units };
}

export function UnitPricingEditor({ value, onChange, error }: {
  value: UnitDraft[];
  onChange: (next: UnitDraft[]) => void;
  error?: string | null;
}) {
  const enabledCount = value.filter((d) => d.enabled).length;
  const hasDefault = value.some((d) => d.enabled && d.is_default);

  function patch(unit: SaleUnit, changes: Partial<UnitDraft>) {
    onChange(value.map((d) => (d.unit === unit ? { ...d, ...changes } : d)));
  }

  function toggle(unit: SaleUnit, on: boolean) {
    let next = value.map((d) => (d.unit === unit ? { ...d, enabled: on, is_default: on ? d.is_default : false } : d));
    // Keep a default: the first unit switched on, or the next one left when the default is switched off.
    if (!next.some((d) => d.enabled && d.is_default)) {
      const first = next.find((d) => d.enabled);
      if (first) next = next.map((d) => ({ ...d, is_default: d.unit === first.unit }));
    }
    onChange(next);
  }

  function makeDefault(unit: SaleUnit) {
    onChange(value.map((d) => ({ ...d, is_default: d.unit === unit })));
  }

  const piece = value.find((d) => d.unit === 'piece' && d.enabled);
  const piecePrice = piece ? num(piece.sale_price || piece.price) : NaN;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>وحدات البيع والأسعار</Text>
        <Text style={{ fontSize: 12, color: COLORS.muted, lineHeight: 18 }}>
          فعّل كل وحدة يُباع بها المنتج. لكل وحدة سعرها وعرضها وأقل كمية خاصة بها. الوحدة الافتراضية هي التي تظهر في القوائم.
        </Text>
      </View>

      {value.map((d) => {
        const label = UNIT_LABELS[d.unit];
        const price = num(d.price);
        const sale = num(d.sale_price);
        const salePct = price > 0 && sale > 0 && sale < price ? Math.round((1 - sale / price) * 100) : 0;
        const pieces = parseInt(d.pieces_per_unit, 10);
        const perPiece = HAS_CONTENTS.includes(d.unit) && pieces > 0 && price > 0 ? (sale > 0 && sale < price ? sale : price) / pieces : NaN;
        const showDefaultControl = d.enabled && enabledCount > 1;

        return (
          <View key={d.unit} style={{ borderWidth: 1, borderColor: d.enabled ? COLORS.brand : COLORS.line, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: d.enabled ? COLORS.brandTint : COLORS.surface }}>
              <Switch
                value={d.enabled}
                onValueChange={(on) => toggle(d.unit, on)}
                trackColor={{ true: COLORS.brandFill, false: COLORS.line }}
                accessibilityLabel={`البيع بال${label}`}
              />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.ink }}>بال{label}</Text>
              {d.enabled && d.is_default && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: COLORS.ink }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>الافتراضية</Text>
                </View>
              )}
              {showDefaultControl && !d.is_default && (
                <TouchableOpacity onPress={() => makeDefault(d.unit)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandText }}>اجعلها الافتراضية</Text>
                </TouchableOpacity>
              )}
            </View>

            {d.enabled && (
              <View style={{ padding: 12, paddingBottom: 0 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label={`سعر ال${label} (د.أ) *`} value={d.price} onChangeText={(v) => patch(d.unit, { price: v })} keyboardType="decimal-pad" placeholder="0.000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="سعر العرض (اختياري)"
                      value={d.sale_price}
                      onChangeText={(v) => patch(d.unit, { sale_price: v })}
                      keyboardType="decimal-pad"
                      placeholder="بدون عرض"
                      hint={salePct ? `خصم ${salePct}%` : undefined}
                    />
                  </View>
                </View>

                {!!d.sale_price.trim() && (
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="ينتهي العرض في (اختياري)"
                        value={d.sale_ends_on}
                        onChangeText={(v) => patch(d.unit, { sale_ends_on: v })}
                        placeholder="2026-12-31"
                        hint={d.sale_ends_on.trim() ? 'يظهر للعملاء كعرض بعدّاد تنازلي' : 'فارغ = العرض مستمر حتى تلغيه'}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => patch(d.unit, { sale_price: '', sale_ends_on: '' })}
                      style={{ marginTop: 26, height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="close" size={16} color={COLORS.danger} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger }}>إلغاء العرض</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label={`أقل كمية (${label})`} value={d.min_qty} onChangeText={(v) => patch(d.unit, { min_qty: v })} keyboardType="number-pad" placeholder="1" />
                  </View>
                  {HAS_CONTENTS.includes(d.unit) ? (
                    <View style={{ flex: 1 }}>
                      <Input
                        label={`عدد الحبات في ال${label}`}
                        value={d.pieces_per_unit}
                        onChangeText={(v) => patch(d.unit, { pieces_per_unit: v })}
                        keyboardType="number-pad"
                        placeholder="اختياري"
                        hint={!isNaN(perPiece)
                          ? `${formatPrice(perPiece)} للحبة${piecePrice > 0 && perPiece < piecePrice ? ` · أوفر ${Math.round((1 - perPiece / piecePrice) * 100)}% من الحبة` : ''}`
                          : undefined}
                      />
                    </View>
                  ) : <View style={{ flex: 1 }} />}
                </View>
              </View>
            )}
          </View>
        );
      })}

      {enabledCount > 0 && !hasDefault && (
        <Text style={{ fontSize: 12, color: COLORS.brandText }}>ستُستخدم أول وحدة مفعّلة كافتراضية.</Text>
      )}
      {!!error && <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger }}>{error}</Text>}
    </View>
  );
}
