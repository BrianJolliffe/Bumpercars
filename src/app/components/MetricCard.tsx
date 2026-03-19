import { LucideIcon, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  color?: string;
  description?: string;
}

export function MetricCard({ label, value, icon: Icon, trend, color = "text-green-600", description }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow relative">
      {description && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm text-gray-600" align="end">
            {description}
          </PopoverContent>
        </Popover>
      )}
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        {Icon && (
          <div className={`${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-gray-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}