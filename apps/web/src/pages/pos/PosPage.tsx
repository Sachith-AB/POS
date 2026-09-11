import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { api, ApiError } from '../../lib/api';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { UndoToast } from '../../components/UndoToast';
import { Receipt } from '../../components/Receipt';
import { Input } from '../../components/Input';
import type { Product } from '../../features/products/productsSlice';
import { quickButtonsRequested } from '../../features/products/productsSlice';
import {
  activeBillSwitched,
  billResumed,
  customerPhoneChanged,
  discountChanged,
  discountPercentChanged,
  itemScanned,
  linePriceChanged,
  linePriceTypeChanged,
  lineQuantityChanged,
  lineRemoved,
  lineRestored,
  lastRemovedCleared,
  priceCheckToggled,
  saleCompleteRequested,
  saleUndone,
  lastCompletedCleared,
  warrantySelected,
  tradeInApplied,
  serializedItemAdded,
} from '../../features/pos/posSlice';

import type { MobilePhoneProduct, SerializedItemStock, TradeInItem, WarrantyOption } from './components/types';
import { PosBillSlotsBar } from './components/PosBillSlotsBar';
import { PosMobileCatalog } from './components/PosMobileCatalog';
import { PosCustomerHeader } from './components/PosCustomerHeader';
import { PosCartTable } from './components/PosCartTable';
import { PosQuickButtons } from './components/PosQuickButtons';
import { PosCheckoutPanel } from './components/PosCheckoutPanel';
import { PosImeiModal } from './components/PosImeiModal';
import { PosTradeInModal } from './components/PosTradeInModal';
import { PosSuccessModal } from './components/PosSuccessModal';

export function PosPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileTab = searchParams.get('tab') === 'mobile';

  const { bills, activeIndex, priceCheckMode, saving, completing, lastRemoved, lastCompletedBill, error } = useAppSelector(
    (s) => s.pos
  );
  const quickButtons = useAppSelector((s) => s.products.quickButtons);
  const settings = useAppSelector((s) => s.settings.data);
  const lastCompleted = useAppSelector((s) => s.pos.lastCompleted);
  const bill = bills[activeIndex];
  const printedRef = useRef<string | null>(null);

  const [term, setTerm] = useState('');
  const [notFound, setNotFound] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSaleUndoToast, setShowSaleUndoToast] = useState(false);
  const [undoingSale, setUndoingSale] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('percent');
  const [applyDiscount, setApplyDiscount] = useState(false);
  const discountInputRef = useRef<HTMLInputElement>(null);

  // Mobile Phones Catalog & IMEI state
  const [mobilePhones, setMobilePhones] = useState<MobilePhoneProduct[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [selectedMobileForImei, setSelectedMobileForImei] = useState<MobilePhoneProduct | null>(null);

  // Warranties & Trade-in state
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [showTradeInModal, setShowTradeInModal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setAmount('');
  }, [activeIndex]);

  const handleF1 = () => {
    const active = document.activeElement;
    const isQtyFocused = Object.values(qtyInputRefs.current).some((el) => el === active);

    if (isQtyFocused) {
      searchRef.current?.focus();
      searchRef.current?.select();
    } else if (bill.items.length > 0) {
      const targetId = lastAddedId || bill.items[bill.items.length - 1].productId;
      const el = qtyInputRefs.current[targetId] || qtyInputRefs.current[bill.items[bill.items.length - 1].productId];
      if (el) {
        el.focus();
        el.select();
      }
    } else {
      searchRef.current?.focus();
    }
  };

  const toggleDiscount = useCallback(() => {
    setApplyDiscount((prev) => {
      const next = !prev;
      if (!next) {
        dispatch(discountChanged(0));
        dispatch(discountPercentChanged(0));
      } else {
        const defaultPct = settings?.defaultDiscountPercent ? Number(settings.defaultDiscountPercent) : 10;
        if (discountMode === 'percent') {
          dispatch(discountPercentChanged(defaultPct));
        }
        setTimeout(() => discountInputRef.current?.focus(), 50);
      }
      return next;
    });
  }, [dispatch, settings?.defaultDiscountPercent, discountMode]);

  useEffect(() => {
    searchRef.current?.focus();
    dispatch(quickButtonsRequested());

    api.get<WarrantyOption[]>('/warranties?sales=true')
      .then((data) => setWarranties(data || []))
      .catch(() => {});

    api.get<TradeInItem[]>('/trade-ins?status=PENDING')
      .then((data) => setTradeIns(data || []))
      .catch(() => {});
  }, [dispatch]);

  const fetchMobilePhones = useCallback(async (query?: string) => {
    setMobileLoading(true);
    try {
      const url = query ? `/products/mobiles?search=${encodeURIComponent(query)}` : '/products/mobiles';
      const data = await api.get<MobilePhoneProduct[]>(url);
      setMobilePhones(data || []);
    } catch (err) {
      console.error('Failed to load mobile phones', err);
    } finally {
      setMobileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMobileTab) {
      fetchMobilePhones(mobileSearch);
    }
  }, [isMobileTab, fetchMobilePhones, mobileSearch]);

  useEffect(() => {
    if (bill.discount > 0 || (bill.discountPercent ?? 0) > 0) {
      setApplyDiscount(true);
    } else {
      setApplyDiscount(false);
    }
  }, [activeIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggleDiscount();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDiscount]);

  useEffect(() => {
    return () => {
      dispatch(lastCompletedCleared());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!showSuccessModal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setShowSuccessModal(false);
        dispatch(lastCompletedCleared());
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuccessModal, dispatch]);

  useEffect(() => {
    if (!priceCheckMode) {
      setNotFound(null);
    }
  }, [priceCheckMode]);

  const subtotal = bill.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tradeInDeduction = bill.tradeInValue || 0;
  const total = Math.max(0, subtotal - bill.discount - tradeInDeduction);

  const tenderedNum = amount !== '' ? Number(amount) : 0;
  const changeAmount = Math.max(0, Math.round((tenderedNum - total) * 100) / 100);

  const quickCashOptions = useMemo(() => {
    if (total <= 0) return [];
    const standardBills = [500, 1000, 2000, 5000];
    const higherBills = standardBills.filter((b) => b > total);
    if (higherBills.length > 0) {
      return higherBills.slice(0, 3);
    }
    const nextThousand = Math.ceil(total / 1000) * 1000;
    const nextFiveThousand = Math.ceil(total / 5000) * 5000;
    return [nextThousand !== total ? nextThousand : total + 1000, nextFiveThousand].filter(
      (v, i, arr) => v > total && arr.indexOf(v) === i
    );
  }, [total]);

  const hasMobileInBill = bill.items.some((i) => i.isSerialized || Boolean(i.imei) || Boolean(i.serializedItemId));
  const hasCustomer = Boolean(
    bill.customerId ||
      (bill.customerPhone && bill.customerPhone.trim().length >= 7) ||
      (bill.customerName && bill.customerName.trim().length > 0)
  );
  const mobileRequiresCustomer = hasMobileInBill && !hasCustomer;

  function handleAddMobileWithImei(product: MobilePhoneProduct, item: SerializedItemStock) {
    const alreadyInBill = bill.items.some((i) => i.serializedItemId === item.id);
    if (alreadyInBill) {
      toast.error(`IMEI ${item.imei} is already added to this bill.`);
      return;
    }

    dispatch(
      serializedItemAdded({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: Number(product.sellPrice),
        retailPrice: Number(product.sellPrice),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        businessPrice: product.businessPrice ? Number(product.businessPrice) : null,
        priceType: 'RETAIL',
        serializedItemId: item.id,
        imei: item.imei,
      })
    );
    setLastAddedId(product.id);
    setSelectedMobileForImei(null);
    toast.success(`Added ${product.name} (IMEI: ${item.imei}) to current bill`);
  }

  function addProduct(product: Product) {
    if (priceCheckMode) {
      setNotFound(`${product.name}: Rs ${Number(product.sellPrice).toFixed(2)}`);
      return;
    }
    dispatch(
      itemScanned({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: Number(product.sellPrice),
        retailPrice: Number(product.sellPrice),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        businessPrice: product.businessPrice ? Number(product.businessPrice) : null,
        priceType: 'RETAIL',
      })
    );
    setLastAddedId(product.id);
  }

  async function handleEnter() {
    const query = term.trim();
    if (!query) return;
    setNotFound(null);

    // 1. Try direct IMEI match
    try {
      const imeiResult = await api.get<any>(`/products/imei/${encodeURIComponent(query)}`);
      if (imeiResult && imeiResult.selectedSerializedItem) {
        const alreadyInBill = bill.items.some((i) => i.serializedItemId === imeiResult.selectedSerializedItem.id);
        if (alreadyInBill) {
          toast.error(`IMEI ${imeiResult.selectedSerializedItem.imei} is already in the bill.`);
          setTerm('');
          return;
        }

        dispatch(
          serializedItemAdded({
            productId: imeiResult.id,
            name: imeiResult.name,
            barcode: imeiResult.barcode,
            unitPrice: Number(imeiResult.sellPrice),
            retailPrice: Number(imeiResult.sellPrice),
            wholesalePrice: imeiResult.wholesalePrice ? Number(imeiResult.wholesalePrice) : null,
            businessPrice: imeiResult.businessPrice ? Number(imeiResult.businessPrice) : null,
            priceType: 'RETAIL',
            serializedItemId: imeiResult.selectedSerializedItem.id,
            imei: imeiResult.selectedSerializedItem.imei,
          })
        );
        setLastAddedId(imeiResult.id);
        setTerm('');
        toast.success(`Added ${imeiResult.name} (IMEI: ${imeiResult.selectedSerializedItem.imei})`);
        return;
      }
    } catch {
      // Not a direct IMEI
    }

    try {
      const product = await api.get<Product>(`/products/barcode/${encodeURIComponent(query)}`);
      if (product.isSerialized) {
        const mobiles = await api.get<MobilePhoneProduct[]>(`/products/mobiles?search=${encodeURIComponent(product.name)}`);
        const target = mobiles.find((m) => m.id === product.id) || (product as MobilePhoneProduct);
        if (target.serializedItems && target.serializedItems.length > 0) {
          setSelectedMobileForImei(target);
          setTerm('');
          return;
        } else {
          toast.error(`No in-stock IMEIs found for ${product.name}`);
          setTerm('');
          return;
        }
      }
      addProduct(product);
      setTerm('');
      return;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }

    const results = await api.get<Product[]>(`/products?search=${encodeURIComponent(query)}`);
    if (results.length > 0) {
      if (results[0].isSerialized) {
        const mobiles = await api.get<MobilePhoneProduct[]>(`/products/mobiles?search=${encodeURIComponent(results[0].name)}`);
        const target = mobiles.find((m) => m.id === results[0].id) || (results[0] as MobilePhoneProduct);
        if (target.serializedItems && target.serializedItems.length > 0) {
          setSelectedMobileForImei(target);
          setTerm('');
          return;
        } else {
          toast.error(`No in-stock IMEIs found for ${results[0].name}`);
          setTerm('');
          return;
        }
      }
      addProduct(results[0]);
      setTerm('');
    } else {
      setNotFound(`No product found for "${query}"`);
    }
  }

  function handleMethodChange(m: 'CASH' | 'CARD' | 'BANK_TRANSFER') {
    setMethod(m);
    if ((m === 'CARD' || m === 'BANK_TRANSFER') && (!amount || Number(amount) === 0) && total > 0) {
      setAmount(total.toFixed(2));
    }
  }

  function handleComplete() {
    if (bill.items.length === 0) {
      toast.warn('Please add products to the bill before completing the sale.');
      return;
    }

    if (hasMobileInBill && !hasCustomer) {
      toast.error('Customer details are mandatory when selling a mobile phone. Please enter customer phone or select a customer.');
      return;
    }

    const missingImeiItem = bill.items.find((i) => i.isSerialized && !i.imei);
    if (missingImeiItem) {
      toast.error(`Please select an IMEI for ${missingImeiItem.name} before completing sale.`);
      return;
    }

    if (!amount || !amount.trim()) {
      toast.error('Amount paid is required to complete the sale. Please enter the amount paid (F2).');
      amountRef.current?.focus();
      amountRef.current?.select();
      return;
    }

    const tenderedVal = Number(amount);
    if (isNaN(tenderedVal) || tenderedVal <= 0) {
      toast.error('Please enter a valid amount paid.');
      amountRef.current?.focus();
      amountRef.current?.select();
      return;
    }

    if (tenderedVal < total) {
      toast.error(`Amount paid (Rs ${tenderedVal.toFixed(2)}) is less than total payable amount (Rs ${total.toFixed(2)}).`);
      amountRef.current?.focus();
      amountRef.current?.select();
      return;
    }

    const changeVal = Math.max(0, Math.round((tenderedVal - total) * 100) / 100);
    const paymentAmount = total;
    dispatch(
      saleCompleteRequested({
        amount: paymentAmount,
        method,
        tenderedAmount: tenderedVal,
        changeAmount: changeVal,
      })
    );
  }

  async function handleUndoSale() {
    const saleId = lastCompletedBill?.saleId || lastCompleted?.id;
    if (!saleId) return;
    setUndoingSale(true);
    try {
      await api.post(`/sales/${saleId}/void`);
      if (lastCompletedBill) {
        dispatch(saleUndone());
      } else if (lastCompleted) {
        dispatch(
          billResumed({
            billIndex: activeIndex,
            bill: {
              saleId: null,
              items: lastCompleted.items.map((i) => ({ ...i })),
              customerPhone: lastCompleted.customerPhone || '',
              customerId: null,
              customerName: lastCompleted.customerName,
              customerDetails: null,
              discount: lastCompleted.discount,
              discountPercent: 0,
              warrantyPeriodId: null,
              tradeInId: null,
              tradeInValue: 0,
            },
          })
        );
        dispatch(lastCompletedCleared());
      }
      setShowSaleUndoToast(false);
      setShowSuccessModal(false);
      toast.success('Sale successfully undone');
      setTimeout(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      }, 50);
    } catch (err: unknown) {
      console.error('Failed to undo sale', err);
      const msg = err instanceof Error ? err.message : 'Failed to undo sale';
      toast.error(msg);
    } finally {
      setUndoingSale(false);
    }
  }

  useEffect(() => {
    if (lastCompleted && printedRef.current !== lastCompleted.completedAt) {
      printedRef.current = lastCompleted.completedAt;
      setAmount('');
      window.print();
      setShowSuccessModal(true);
      setShowSaleUndoToast(true);
    }
  }, [lastCompleted]);

  useKeyboardShortcuts({
    F1: handleF1,
    F2: () => amountRef.current?.focus(),
    F12: () => handleComplete(),
    Escape: () => {
      setTerm('');
      setNotFound(null);
      searchRef.current?.focus();
    },
  });

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-4 p-4">
        <div className="flex min-h-0 flex-col gap-3">
          {/* Bill Slots Bar */}
          <PosBillSlotsBar
            bills={bills}
            activeIndex={activeIndex}
            isMobileTab={isMobileTab}
            priceCheckMode={priceCheckMode}
            mobilePhonesCount={mobilePhones.length}
            onSwitchBill={(i) => dispatch(activeBillSwitched(i))}
            onTogglePriceCheck={() => {
              dispatch(priceCheckToggled());
              setNotFound(null);
            }}
            onToggleMobileTab={() => {
              if (isMobileTab) {
                setSearchParams({});
              } else {
                setSearchParams({ tab: 'mobile' });
              }
            }}
          />

          {/* Search Bar / Mobile Catalog */}
          {isMobileTab ? (
            <PosMobileCatalog
              activeIndex={activeIndex}
              mobilePhones={mobilePhones}
              mobileLoading={mobileLoading}
              mobileSearch={mobileSearch}
              onSearchChange={setMobileSearch}
              onSearchKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = mobileSearch.trim();
                  if (query) {
                    api
                      .get<any>(`/products/imei/${encodeURIComponent(query)}`)
                      .then((imeiResult) => {
                        if (imeiResult && imeiResult.selectedSerializedItem) {
                          dispatch(
                            serializedItemAdded({
                              productId: imeiResult.id,
                              name: imeiResult.name,
                              barcode: imeiResult.barcode,
                              unitPrice: Number(imeiResult.sellPrice),
                              retailPrice: Number(imeiResult.sellPrice),
                              wholesalePrice: imeiResult.wholesalePrice ? Number(imeiResult.wholesalePrice) : null,
                              businessPrice: imeiResult.businessPrice ? Number(imeiResult.businessPrice) : null,
                              priceType: 'RETAIL',
                              serializedItemId: imeiResult.selectedSerializedItem.id,
                              imei: imeiResult.selectedSerializedItem.imei,
                            })
                          );
                          setLastAddedId(imeiResult.id);
                          setMobileSearch('');
                          toast.success(`Added ${imeiResult.name} (IMEI: ${imeiResult.selectedSerializedItem.imei})`);
                        }
                      })
                      .catch(() => {});
                  }
                }
              }}
              onSelectMobile={(phone) => setSelectedMobileForImei(phone)}
              onCloseMobileTab={() => setSearchParams({})}
            />
          ) : (
            <>
              <Input
                ref={searchRef}
                placeholder="Scan barcode, scan IMEI, or search item… (F1)"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEnter();
                }}
                autoComplete="off"
                className="w-full text-base py-2.5"
              />
              {notFound ? <p className="text-amber-500 text-sm font-medium">{notFound}</p> : null}
            </>
          )}

          {/* Cart Table */}
          <PosCartTable
            items={bill.items}
            warranties={warranties}
            activeIndex={activeIndex}
            qtyInputRefs={qtyInputRefs}
            searchRef={searchRef}
            onPriceTypeChange={(productId, priceType) =>
              dispatch(linePriceTypeChanged({ productId, priceType }))
            }
            onQuantityChange={(productId, quantity) =>
              dispatch(lineQuantityChanged({ productId, quantity }))
            }
            onPriceChange={(productId, unitPrice) =>
              dispatch(linePriceChanged({ productId, unitPrice }))
            }
            onRemoveLine={(productId, serializedItemId) =>
              dispatch(lineRemoved({ productId, serializedItemId }))
            }
          />

          {/* Quick Buttons (General Mode) */}
          {!isMobileTab && (
            <PosQuickButtons
              quickButtons={quickButtons}
              onAddProduct={addProduct}
            />
          )}
        </div>

        {/* Right Checkout Panel */}
        <PosCheckoutPanel
          customerPhone={bill.customerPhone}
          customerName={bill.customerName}
          onCustomerPhoneChange={(phone) => dispatch(customerPhoneChanged(phone))}
          hasMobileInBill={hasMobileInBill}
          mobileRequiresCustomer={mobileRequiresCustomer}
          warrantyPeriodId={bill.warrantyPeriodId ?? null}
          warranties={warranties}
          onWarrantySelect={(id) => dispatch(warrantySelected(id))}
          tradeInDeduction={tradeInDeduction}
          onOpenTradeInModal={() => setShowTradeInModal(true)}
          onRemoveTradeIn={() => dispatch(tradeInApplied({ tradeInId: null, tradeInValue: 0 }))}
          subtotal={subtotal}
          total={total}
          applyDiscount={applyDiscount}
          onToggleDiscount={toggleDiscount}
          discountMode={discountMode}
          onToggleDiscountMode={() => setDiscountMode(discountMode === 'percent' ? 'amount' : 'percent')}
          discountPercent={bill.discountPercent}
          discount={bill.discount}
          discountInputRef={discountInputRef}
          onDiscountPercentChange={(val) => dispatch(discountPercentChanged(val))}
          onDiscountChange={(val) => dispatch(discountChanged(val))}
          method={method}
          onMethodChange={handleMethodChange}
          amount={amount}
          onAmountChange={setAmount}
          amountRef={amountRef}
          quickCashOptions={quickCashOptions}
          tenderedNum={tenderedNum}
          changeAmount={changeAmount}
          onComplete={handleComplete}
          completing={completing}
          saving={saving}
          error={error}
        />
      </div>

      {/* IMEI Selection Modal */}
      <PosImeiModal
        selectedMobile={selectedMobileForImei}
        onClose={() => setSelectedMobileForImei(null)}
        onSelectImei={handleAddMobileWithImei}
        billItems={bill.items}
      />

      {/* Trade-In Selection Modal */}
      <PosTradeInModal
        isOpen={showTradeInModal}
        onClose={() => setShowTradeInModal(false)}
        tradeIns={tradeIns}
        onApplyTradeIn={(tradeInId, tradeInValue) => dispatch(tradeInApplied({ tradeInId, tradeInValue }))}
      />

      {/* Undo Toast */}
      {lastRemoved ? (
        <UndoToast
          message={`Removed ${lastRemoved.line.name}`}
          onUndo={() => dispatch(lineRestored())}
          onExpire={() => dispatch(lastRemovedCleared())}
        />
      ) : null}

      {showSaleUndoToast && (lastCompletedBill || lastCompleted) ? (
        <UndoToast
          message={`Sale completed (Rs ${(lastCompletedBill?.total ?? lastCompleted?.total ?? 0).toFixed(2)})`}
          duration={8}
          onUndo={handleUndoSale}
          onExpire={() => setShowSaleUndoToast(false)}
        />
      ) : null}

      <Receipt />

      {/* Post-Sale Completion Modal */}
      <PosSuccessModal
        isOpen={showSuccessModal}
        lastCompleted={lastCompleted}
        onClose={() => {
          setShowSuccessModal(false);
          dispatch(lastCompletedCleared());
        }}
        onPrintReceipt={() => window.print()}
        onUndoSale={handleUndoSale}
        undoingSale={undoingSale}
        onNavigate={(path) => navigate(path)}
        defaultDownPaymentPercent={settings?.defaultDownPaymentPercent ? Number(settings.defaultDownPaymentPercent) : 35}
        defaultInterestMethod={settings?.defaultInterestMethod || 'PERCENTAGE'}
        defaultInterestValue={Number(settings?.defaultInterestValue || 12)}
      />
    </>
  );
}
