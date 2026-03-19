import { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical, Play, FileText, CircleAlert, Clock, Star, Pencil, Trash2, MoreHorizontal, Check } from "lucide-react";

interface DraggableTabProps {
  id: string;
  index: number;
  label: string;
  description?: string;
  icon?: "running" | "draft" | "attention" | "ending7d" | "watchlist" | null;
  count?: number;
  isActive: boolean;
  isCustomView?: boolean;
  isDefaultView?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMakeDefault?: () => void;
  moveTab: (dragIndex: number, hoverIndex: number) => void;
}

const ITEM_TYPE = "TAB";

const iconMap = {
  running: Play,
  draft: FileText,
  attention: CircleAlert,
  ending7d: Clock,
  watchlist: Star,
};

export function DraggableTab({
  id,
  index,
  label,
  description,
  icon,
  count,
  isActive,
  isCustomView = false,
  isDefaultView = false,
  onClick,
  onEdit,
  onDelete,
  onMakeDefault,
  moveTab,
}: DraggableTabProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [showDefaultTooltip, setShowDefaultTooltip] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLSpanElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: { id: string; index: number }) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveTab(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  // Combine drag and drop refs
  drag(drop(ref));

  // Close menu on outside click
  useEffect(() => {
    if (!showTabMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)
      ) {
        setShowTabMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTabMenu]);

  const IconComponent = icon ? iconMap[icon] : null;

  return (
    <div className="relative">
      <button
        ref={ref}
        className={`group flex items-center gap-1 pb-2 border-b-2 transition-colors ${
          isActive
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        } ${isDragging ? "opacity-50" : "opacity-100"}`}
        onClick={onClick}
        onMouseEnter={() => {
          if (description && !showTabMenu) {
            tooltipTimeout.current = setTimeout(() => setShowTooltip(true), 400);
          }
        }}
        onMouseLeave={() => {
          if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
          setShowTooltip(false);
        }}
        style={{ cursor: isDragging ? "grabbing" : "grab", fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-sm)' }}
      >
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity -ml-1" />
        {IconComponent && <IconComponent className={`w-3 h-3 ${icon === "watchlist" ? "fill-current" : ""}`} />}
        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{label}</span>
        {typeof count === "number" && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none" style={{ fontSize: '10px', fontWeight: 600 }}>{count}</span>
        )}

        {/* More icon on active tab — opens dropdown */}
        {isActive && (onEdit || onDelete) && (
          <span
            ref={menuBtnRef}
            role="button"
            className="p-0.5 rounded hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowTabMenu(!showTabMenu);
              setShowTooltip(false);
            }}
            title="View options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Action icons that expand on hover for non-active tabs */}
        <span className="flex items-center gap-0.5 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[48px] group-hover:opacity-100 transition-all duration-200 ease-in-out">
          {!isActive && onEdit && (
            <span
              role="button"
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit view"
            >
              <Pencil className="w-3 h-3" />
            </span>
          )}
          {!isActive && isCustomView && onDelete && (
            <span
              role="button"
              className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete view"
            >
              <Trash2 className="w-3 h-3" />
            </span>
          )}
        </span>
      </button>

      {/* Active tab dropdown menu */}
      {showTabMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border py-1 min-w-[200px]"
          style={{ borderRadius: 'var(--radius-card)', fontFamily: 'var(--font-family-inter)', boxShadow: 'var(--elevation-sm)' }}
        >
          {/* Edit View */}
          {onEdit && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-popover-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              style={{ fontSize: 'var(--text-sm)' }}
              onClick={(e) => {
                e.stopPropagation();
                setShowTabMenu(false);
                onEdit();
              }}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              <span style={{ fontWeight: 'var(--font-weight-normal)' }}>Edit View</span>
            </button>
          )}

          {/* Make Default View */}
          {onMakeDefault && (
            <div className="relative">
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
                  isDefaultView
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-popover-foreground hover:bg-muted/50 cursor-pointer"
                }`}
                style={{ fontSize: 'var(--text-sm)' }}
                disabled={isDefaultView}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDefaultView) {
                    setShowTabMenu(false);
                    onMakeDefault();
                  }
                }}
                onMouseEnter={() => {
                  if (isDefaultView) setShowDefaultTooltip(true);
                }}
                onMouseLeave={() => setShowDefaultTooltip(false)}
              >
                <Check className={`w-3.5 h-3.5 ${isDefaultView ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
                <span style={{ fontWeight: 'var(--font-weight-normal)' }}>Make Default View</span>
              </button>
              {/* Tooltip for disabled default view */}
              {showDefaultTooltip && isDefaultView && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-foreground text-background px-2.5 py-1.5 whitespace-nowrap pointer-events-none"
                  style={{ borderRadius: 'var(--radius-badge)', fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-xs)' }}
                >
                  This is currently your default view.
                </div>
              )}
            </div>
          )}

          {/* Delete View — only for custom views */}
          {isCustomView && onDelete && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
                style={{ fontSize: 'var(--text-sm)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTabMenu(false);
                  onDelete();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span style={{ fontWeight: 'var(--font-weight-normal)' }}>Delete View</span>
              </button>
            </>
          )}
        </div>
      )}

      {showTooltip && description && !showTabMenu && (
        <div className="absolute top-full left-0 mt-2 z-50 w-56 bg-popover border border-border p-3 pointer-events-none" style={{ borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}>
          <p className="text-foreground" style={{ fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>{label}</p>
          <p className="text-muted-foreground leading-relaxed mt-1" style={{ fontFamily: 'var(--font-family-inter)', fontSize: 'var(--text-xs)' }}>{description}</p>
        </div>
      )}
    </div>
  );
}
