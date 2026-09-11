import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  plansRequested,
  filtersChanged,
  planDetailRequested,
  planCreateRequested,
  paymentRecordRequested,
  clearSelectedPlan,
  type InstallmentPlan,
} from '../../features/installments/installmentsSlice';
import { UndoToast } from '../../components/UndoToast';
import { PhotoCapture } from '../../components/PhotoCapture';
import { api } from '../../lib/api';
import { printHtmlViaIframe, generateAgreementStickerHtml } from '../../lib/printUtils';

import type { CustomerDetails, SaleMinimal, AgreementProductItem } from './components/types';
import { InstallmentsHeader } from './components/InstallmentsHeader';
import { InstallmentPlansTable } from './components/InstallmentPlansTable';
import { InstallmentDetailDrawer } from './components/InstallmentDetailDrawer';
import { CreateAgreementModal } from './components/CreateAgreementModal';

export function InstallmentsPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const createSaleId = searchParams.get('createSaleId');

  const settings = useAppSelector((s) => s.settings.data);
  const { items, total, page, pages, selectedPlan, loading, saving, filters } =
    useAppSelector((s) => s.installments);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleMinimal | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<AgreementProductItem[]>([]);

  // Customer details for agreement holder
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNic, setCustomerNic] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerSearched, setCustomerSearched] = useState(false);

  // Guarantor auto-fill info
  const [guarantorCustomerMatch, setGuarantorCustomerMatch] = useState<CustomerDetails | null>(null);

  // Barcode scanner lookup input
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Create plan state
  const [downPayment, setDownPayment] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('6');
  const [intervalDays, setIntervalDays] = useState('30');
  const [interestMethod, setInterestMethod] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [interestValue, setInterestValue] = useState('12');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorNic, setGuarantorNic] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [guarantorPhotoUrl, setGuarantorPhotoUrl] = useState('');
  const [guarantorConsent, setGuarantorConsent] = useState(true);

  // Guarantor photo webcam capture state
  const [showPhotoCaptureModal, setShowPhotoCaptureModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Record payment state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

  // 5-Second Undo Toast State
  const [undoToast, setUndoToast] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);

  function triggerUndoToast(message: string, onUndoCallback: () => void) {
    setUndoToast({
      message,
      onUndo: onUndoCallback,
    });
  }

  useEffect(() => {
    dispatch(plansRequested(filters));
  }, [dispatch]);

  // Handle URL creation trigger (e.g. from POS "Buy with Installment Plan")
  useEffect(() => {
    if (createSaleId) {
      api
        .get<any>(`/sales/${createSaleId}`)
        .then((sale) => {
          setSelectedSale({
            id: sale.id,
            total: sale.total,
            createdAt: sale.createdAt,
            customer: sale.customer,
            items: sale.items,
          });

          // Pre-fill defaults from query params or settings
          const urlDown = searchParams.get('downPayment');
          const urlMonths = searchParams.get('months');
          const urlInterest = searchParams.get('interest');
          const urlPhone = searchParams.get('phone') || searchParams.get('customerPhone');

          const defaultDownPct = settings?.defaultDownPaymentPercent
            ? Number(settings.defaultDownPaymentPercent)
            : 35;
          const calculatedDown = urlDown
            ? urlDown
            : ((Number(sale.total) * defaultDownPct) / 100).toFixed(2);

          setDownPayment(calculatedDown);
          setNumberOfInstallments(urlMonths || '6');
          setInterestValue(urlInterest || String(settings?.defaultInterestValue ?? 12));
          setInterestMethod(settings?.defaultInterestMethod || 'PERCENTAGE');

          if (urlPhone && !sale.customer?.phone) {
            setCustomerPhone(urlPhone);
          }

          setShowCreateModal(true);
          const updatedParams = new URLSearchParams(searchParams);
          updatedParams.delete('createSaleId');
          updatedParams.delete('phone');
          updatedParams.delete('customerPhone');
          setSearchParams(updatedParams);
        })
        .catch((err) => console.error(err));
    }
  }, [createSaleId, settings]);

  // Sync customer details when selectedSale is selected or loaded
  useEffect(() => {
    if (selectedSale?.customer) {
      const p = selectedSale.customer.phone || '';
      setCustomerPhone(p);
      setCustomerName(selectedSale.customer.name || '');
      setCustomerNic(selectedSale.customer.nic || '');
      setCustomerAddress(selectedSale.customer.address || '');
      if (p) {
        api
          .get<CustomerDetails | null>(`/customers/lookup?phone=${encodeURIComponent(p)}`)
          .then((res) => {
            if (res) {
              setCustomerDetails(res);
              if (res.nic) setCustomerNic(res.nic);
              if (res.address) setCustomerAddress(res.address);
            } else {
              setCustomerDetails(null);
            }
          })
          .catch(() => {
            setCustomerDetails(null);
          });
      } else {
        setCustomerDetails(null);
      }
    } else if (selectedSale && !selectedSale.customer) {
      setCustomerPhone('');
      setCustomerName('');
      setCustomerNic('');
      setCustomerAddress('');
      setCustomerDetails(null);
      setCustomerSearched(false);
    }
  }, [selectedSale?.id]);

  // Handler for customer phone changes
  const handleCustomerPhoneChange = (newPhone: string) => {
    setCustomerPhone(newPhone);
    const trimmed = newPhone.trim();
    if (!customerDetails || customerDetails.phone !== trimmed) {
      setCustomerDetails(null);
      setCustomerName('');
      setCustomerNic('');
      setCustomerAddress('');
      setCustomerSearched(false);
    }
  };

  // Handler when products list changes in manual product selection
  const handleProductsChange = (products: AgreementProductItem[]) => {
    setSelectedProducts(products);
    if (!selectedSale) {
      const defaultDownPct = settings?.defaultDownPaymentPercent
        ? Number(settings.defaultDownPaymentPercent)
        : 35;
      const total = products.reduce((acc, p) => acc + p.lineTotal, 0);
      setDownPayment(((total * defaultDownPct) / 100).toFixed(2));
    }
  };

  // Debounced customer lookup when customerPhone changes
  useEffect(() => {
    const trimmed = customerPhone.trim();
    if (trimmed.length < 3) {
      setCustomerDetails(null);
      setCustomerSearched(false);
      setCustomerName('');
      setCustomerNic('');
      setCustomerAddress('');
      return;
    }

    const timer = setTimeout(() => {
      setCustomerSearching(true);
      api
        .get<CustomerDetails | null>(`/customers/lookup?phone=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          setCustomerSearched(true);
          if (res) {
            setCustomerDetails(res);
            setCustomerName(res.name || '');
            setCustomerNic(res.nic || '');
            setCustomerAddress(res.address || '');
            setSelectedSale((prev) =>
              prev
                ? {
                    ...prev,
                    customer: {
                      id: res.id,
                      name: res.name,
                      phone: res.phone,
                      nic: res.nic,
                      address: res.address,
                      categories: res.categories,
                    },
                  }
                : null
            );
          } else {
            setCustomerDetails(null);
            setCustomerName('');
            setCustomerNic('');
            setCustomerAddress('');
          }
        })
        .catch(() => {
          setCustomerDetails(null);
          setCustomerSearched(true);
          setCustomerName('');
          setCustomerNic('');
          setCustomerAddress('');
        })
        .finally(() => {
          setCustomerSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  // Debounced lookup for guarantor phone
  useEffect(() => {
    const trimmed = guarantorPhone.trim();
    if (trimmed.length < 4) {
      setGuarantorCustomerMatch(null);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<CustomerDetails | null>(`/customers/lookup?phone=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          if (res) {
            setGuarantorCustomerMatch(res);
            if (!guarantorName && res.name) setGuarantorName(res.name);
            if (!guarantorNic && res.nic) setGuarantorNic(res.nic);
            if (!guarantorAddress && res.address) setGuarantorAddress(res.address);
          } else {
            setGuarantorCustomerMatch(null);
          }
        })
        .catch(() => setGuarantorCustomerMatch(null));
    }, 400);

    return () => clearTimeout(timer);
  }, [guarantorPhone]);

  async function handleBarcodeLookup() {
    const code = barcodeSearch.trim();
    if (!code) return;
    setBarcodeSearching(true);
    setBarcodeError(null);
    try {
      const plan = await api.get<InstallmentPlan>(`/agreements/lookup/${encodeURIComponent(code)}`);
      dispatch(planDetailRequested(plan.id));
      setBarcodeSearch('');
    } catch {
      setBarcodeError(`No agreement found for barcode "${code}"`);
    } finally {
      setBarcodeSearching(false);
    }
  }

  function handleFilterStatusChange(status: string) {
    dispatch(filtersChanged({ status, page: 1 }));
    dispatch(plansRequested({ ...filters, status, page: 1 }));
  }

  function handlePageChange(nextPage: number) {
    dispatch(filtersChanged({ page: nextPage }));
    dispatch(plansRequested({ ...filters, page: nextPage }));
  }

  async function handleGuarantorPhotoCapture(file: File) {
    setUploadingPhoto(true);
    setShowPhotoCaptureModal(false);

    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    setGuarantorPhotoUrl(localUrl);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.upload<{ url: string }>('/installments/upload-photo', formData);
      if (res?.url) {
        setGuarantorPhotoUrl(res.url);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setGuarantorPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if ((!selectedSale && selectedProducts.length === 0) || !downPayment || !numberOfInstallments || !intervalDays) return;

    let targetSaleId = selectedSale?.id;

    // If products were chosen directly in the modal, create a PARKED sale for them first
    if (!targetSaleId) {
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product for the installment agreement');
        return;
      }
      try {
        const createdSale = await api.post<any>('/sales', {
          status: 'PARKED',
          customerId: customerDetails?.id || undefined,
          items: selectedProducts.map((p) => ({
            productId: p.productId,
            serializedItemId: p.serializedItemId || undefined,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            priceType: 'RETAIL',
          })),
          discount: 0,
        });
        targetSaleId = createdSale.id;
      } catch (err: any) {
        toast.error(err.message || 'Failed to initialize sale for selected products');
        return;
      }
    }

    if (!targetSaleId) {
      toast.error('Sale reference is required to create an agreement');
      return;
    }

    const effectivePhone = customerPhone.trim() || selectedSale?.customer?.phone || '';

    const previousFormState = {
      selectedSale,
      selectedProducts,
      customerPhone,
      customerName,
      customerNic,
      customerAddress,
      customerDetails,
      downPayment,
      numberOfInstallments,
      intervalDays,
      interestMethod,
      interestValue,
      guarantorName,
      guarantorNic,
      guarantorPhone,
      guarantorAddress,
      guarantorPhotoUrl,
      guarantorConsent,
    };

    dispatch(
      planCreateRequested({
        saleId: targetSaleId,
        customerPhone: effectivePhone || undefined,
        customerName: customerName.trim() || undefined,
        customerNic: customerNic.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        downPayment: parseFloat(downPayment),
        numberOfInstallments: parseInt(numberOfInstallments, 10),
        intervalDays: parseInt(intervalDays, 10),
        interestMethod,
        interestValue: parseFloat(interestValue) || 0,
        guarantorName: guarantorName.trim(),
        guarantorNic: guarantorNic.trim(),
        guarantorPhone: guarantorPhone.trim(),
        guarantorAddress: guarantorAddress.trim(),
        guarantorPhotoUrl: guarantorPhotoUrl.trim() || undefined,
        guarantorConsentGiven: guarantorConsent,
      })
    );

    // Reset create state
    setSelectedSale(null);
    setSelectedProducts([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerNic('');
    setCustomerAddress('');
    setCustomerDetails(null);
    setCustomerSearched(false);
    setGuarantorCustomerMatch(null);
    setDownPayment('');
    setGuarantorName('');
    setGuarantorNic('');
    setGuarantorPhone('');
    setGuarantorAddress('');
    setGuarantorPhotoUrl('');
    setShowCreateModal(false);

    triggerUndoToast('Installment plan created', () => {
      setSelectedSale(previousFormState.selectedSale);
      setSelectedProducts(previousFormState.selectedProducts);
      setCustomerPhone(previousFormState.customerPhone);
      setCustomerName(previousFormState.customerName);
      setCustomerNic(previousFormState.customerNic);
      setCustomerAddress(previousFormState.customerAddress);
      setCustomerDetails(previousFormState.customerDetails);
      setDownPayment(previousFormState.downPayment);
      setNumberOfInstallments(previousFormState.numberOfInstallments);
      setIntervalDays(previousFormState.intervalDays);
      setInterestMethod(previousFormState.interestMethod);
      setInterestValue(previousFormState.interestValue);
      setGuarantorName(previousFormState.guarantorName);
      setGuarantorNic(previousFormState.guarantorNic);
      setGuarantorPhone(previousFormState.guarantorPhone);
      setGuarantorAddress(previousFormState.guarantorAddress);
      setGuarantorPhotoUrl(previousFormState.guarantorPhotoUrl);
      setGuarantorConsent(previousFormState.guarantorConsent);
      setShowCreateModal(true);
    });
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !payAmount) return;

    const previousAmount = payAmount;
    const previousMethod = payMethod;

    dispatch(
      paymentRecordRequested({
        planId: selectedPlan.id,
        amount: parseFloat(payAmount),
        method: payMethod,
      })
    );

    setPayAmount('');

    triggerUndoToast(`Installment payment of Rs ${parseFloat(previousAmount).toFixed(2)} recorded`, () => {
      setPayAmount(previousAmount);
      setPayMethod(previousMethod);
    });
  }

  async function printAgreementSticker(plan: InstallmentPlan) {
    const barcode = plan.agreementBarcode || `AGR-${plan.id.slice(-8).toUpperCase()}`;
    const custName = plan.sale?.customer?.name || 'Walk-in';
    const date = new Date(plan.createdAt).toLocaleDateString();
    const totalPay = Number(plan.totalPayable || plan.remainingBalance).toFixed(2);

    let barcodeDataUrl: string | undefined;
    try {
      const res = await api.get<{ dataUrl: string }>(`/agreements/barcode-dataurl/${encodeURIComponent(barcode)}`);
      if (res?.dataUrl) {
        barcodeDataUrl = res.dataUrl;
      }
    } catch (err) {
      console.warn('Could not fetch agreement barcode image, falling back to text format', err);
    }

    const html = generateAgreementStickerHtml({
      barcode,
      customerName: custName,
      date,
      totalAmount: totalPay,
      barcodeDataUrl,
      companyName: settings?.companyName || 'AGREEMENT STICKER',
    });

    printHtmlViaIframe(html);
  }

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas">
      {/* Header with Barcode Scanner Search */}
      <InstallmentsHeader
        barcodeSearch={barcodeSearch}
        onBarcodeSearchChange={setBarcodeSearch}
        onBarcodeLookup={handleBarcodeLookup}
        barcodeSearching={barcodeSearching}
        barcodeError={barcodeError}
        onCreateClick={() => {
          setSelectedSale(null);
          setSelectedProducts([]);
          setShowCreateModal(true);
        }}
      />

      {/* Grid container */}
      <div className="grid flex-1 grid-cols-[1fr_420px] min-h-0 gap-0">
        {/* Left Side: Plans list */}
        <InstallmentPlansTable
          items={items}
          total={total}
          page={page}
          pages={pages}
          loading={loading}
          selectedPlanId={selectedPlan?.id}
          statusFilter={filters.status || 'ALL'}
          onFilterChange={handleFilterStatusChange}
          onSelectPlan={(id) => dispatch(planDetailRequested(id))}
          onPageChange={handlePageChange}
        />

        {/* Right Side: Detail Drawer */}
        <InstallmentDetailDrawer
          selectedPlan={selectedPlan}
          onClose={() => dispatch(clearSelectedPlan())}
          onPrintSticker={printAgreementSticker}
          payAmount={payAmount}
          onPayAmountChange={setPayAmount}
          payMethod={payMethod}
          onPayMethodChange={setPayMethod}
          onRecordPayment={handleRecordPayment}
          savingPayment={saving}
        />
      </div>

      {/* Create Modal */}
      <CreateAgreementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePlan}
        saving={saving}
        selectedSale={selectedSale}
        onSaleSelect={setSelectedSale}
        selectedProducts={selectedProducts}
        onProductsChange={handleProductsChange}
        customerPhone={customerPhone}
        onCustomerPhoneChange={handleCustomerPhoneChange}
        customerSearching={customerSearching}
        customerSearched={customerSearched}
        customerDetails={customerDetails}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerNic={customerNic}
        onCustomerNicChange={setCustomerNic}
        customerAddress={customerAddress}
        onCustomerAddressChange={setCustomerAddress}
        downPayment={downPayment}
        onDownPaymentChange={setDownPayment}
        numberOfInstallments={numberOfInstallments}
        onNumberOfInstallmentsChange={setNumberOfInstallments}
        interestMethod={interestMethod}
        onInterestMethodChange={setInterestMethod}
        interestValue={interestValue}
        onInterestValueChange={setInterestValue}
        guarantorName={guarantorName}
        onGuarantorNameChange={setGuarantorName}
        guarantorPhone={guarantorPhone}
        onGuarantorPhoneChange={setGuarantorPhone}
        guarantorNic={guarantorNic}
        onGuarantorNicChange={setGuarantorNic}
        guarantorAddress={guarantorAddress}
        onGuarantorAddressChange={setGuarantorAddress}
        guarantorCustomerMatch={guarantorCustomerMatch}
        onFillGuarantorMatch={() => {
          if (guarantorCustomerMatch?.name) setGuarantorName(guarantorCustomerMatch.name);
          if (guarantorCustomerMatch?.nic) setGuarantorNic(guarantorCustomerMatch.nic);
          if (guarantorCustomerMatch?.address) setGuarantorAddress(guarantorCustomerMatch.address);
        }}
        guarantorPhotoUrl={guarantorPhotoUrl}
        onGuarantorPhotoUrlChange={setGuarantorPhotoUrl}
        onOpenPhotoCapture={() => setShowPhotoCaptureModal(true)}
        onRemovePhoto={() => setGuarantorPhotoUrl('')}
        uploadingPhoto={uploadingPhoto}
        guarantorConsent={guarantorConsent}
        onGuarantorConsentChange={setGuarantorConsent}
      />

      {/* Web Cam Capture Modal Overlay */}
      {showPhotoCaptureModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg">
            <PhotoCapture
              onCapture={handleGuarantorPhotoCapture}
              onCancel={() => setShowPhotoCaptureModal(false)}
            />
          </div>
        </div>
      ) : null}

      {/* 5-Second Undo Toast Component */}
      {undoToast ? (
        <UndoToast
          message={undoToast.message}
          onUndo={() => {
            const callback = undoToast.onUndo;
            setUndoToast(null);
            callback();
          }}
          onExpire={() => setUndoToast(null)}
        />
      ) : null}
    </div>
  );
}

export default InstallmentsPage;
