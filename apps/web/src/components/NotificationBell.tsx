import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiCheck, FiArrowRight, FiPackage } from 'react-icons/fi';
import { IoNotificationsOutline } from "react-icons/io5";
import { api } from '../lib/api';
import type { Product } from '../features/products/productsSlice';

export interface LowStockNotification {
  id: string;
  productId: string;
  name: string;
  currentQuantity: number;
  lowStockThreshold: number;
  sku?: string | null;
  barcode?: string | null;
  timestamp: Date;
  isRead: boolean;
}

const STORAGE_KEY_SEEN = 'pos_low_stock_seen_ids';

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<LowStockNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const checkLowStock = useCallback(async () => {
    try {
      const items = await api.get<Product[]>('/products/low-stock');
      if (!items || !Array.isArray(items)) return;

      const storedSeenRaw = localStorage.getItem(STORAGE_KEY_SEEN);
      const storedSeen: string[] = storedSeenRaw ? JSON.parse(storedSeenRaw) : [];
      const seenSet = new Set(storedSeen);

      const notifs: LowStockNotification[] = items.map((p) => ({
        id: `${p.id}-${p.quantity}`,
        productId: p.id,
        name: p.name,
        currentQuantity: p.quantity,
        lowStockThreshold: p.lowStockThreshold,
        sku: p.sku,
        barcode: p.barcode,
        timestamp: new Date(),
        isRead: seenSet.has(`${p.id}-${p.quantity}`),
      }));

      // Check if there are unread items
      const unreadCount = notifs.filter((n) => !n.isRead).length;
      if (unreadCount > 0) {
        setHasUnread(true);
      }

      setNotifications(notifs);
    } catch {
      // Ignore API errors when unauthenticated or server restarting
    }
  }, []);

  // Poll on mount and every 25 seconds
  useEffect(() => {
    checkLowStock();
    const interval = setInterval(checkLowStock, 25000);
    return () => clearInterval(interval);
  }, [checkLowStock]);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      // Mark as read when user clicks the bell
      setHasUnread(false);
      const allKeys = notifications.map((n) => n.id);
      localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(allKeys));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleMarkAllRead = () => {
    setHasUnread(false);
    const allKeys = notifications.map((n) => n.id);
    localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(allKeys));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const latestFive = notifications.slice(0, 5);

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-lg transition-all cursor-pointer focus:outline-none ${
          isOpen
            ? 'bg-canvas border-ink text-ink shadow-xs'
            : 'border-border text-muted hover:text-ink hover:bg-canvas'
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <IoNotificationsOutline className="h-4 w-4" />

        {/* Unread Red Dot */}
        {hasUnread && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-surface" />
          </span>
        )}
      </button>

      {/* Slide-in Modal Panel from Right (compact, not full display height) */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed top-14 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200"
          style={{ maxHeight: '440px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-canvas/60">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IoNotificationsOutline className="h-4 w-4" />
              </span>
              <h3 className="text-xs font-bold text-ink">Notifications</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-muted hover:text-ink flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-canvas transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <FiCheck className="h-3 w-3" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-canvas transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body: Latest 5 Notifications */}
          <div className="overflow-y-auto divide-y divide-border" style={{ maxHeight: '320px' }}>
            {latestFive.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FiPackage className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-ink">No new alerts</p>
                <p className="text-[11px] text-muted mt-0.5">All inventory stock levels are healthy.</p>
              </div>
            ) : (
              latestFive.map((n) => (
                <div
                  key={n.id}
                  className="p-3 hover:bg-canvas/50 transition-colors flex items-start gap-2.5 cursor-pointer"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/stock?search=${encodeURIComponent(n.name)}`);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-bold text-ink truncate block">{n.name}</span>
                      <span className="text-[10px] font-mono font-bold text-rose-600 shrink-0">
                        {n.currentQuantity} left
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      Low stock threshold is {n.lowStockThreshold}. Needs replenishment.
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link to Stock */}
          {notifications.length > 0 && (
            <div className="border-t border-border p-2 bg-canvas/40 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/stock');
                }}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all in Stock Management</span>
                <FiArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
