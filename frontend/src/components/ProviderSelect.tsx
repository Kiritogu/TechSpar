import { type ProviderOption } from "@/lib/providers";
import { cn } from "@/lib/utils";

interface ProviderSelectProps {
  value: string;
  options: ProviderOption[];
  onChange: (id: string, opt: ProviderOption) => void;
  className?: string;
}

/** 固定服务商下拉：选中后回调 (id, option)，调用方负责用 option.base_url 填充。 */
export default function ProviderSelect({
  value,
  options,
  onChange,
  className,
}: ProviderSelectProps) {
  return (
    <select
      className={cn(
        "h-12 w-full cursor-pointer appearance-none rounded-2xl bg-card/90 bg-[right_1rem_center] bg-no-repeat pr-10",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        className
      )}
      value={value}
      onChange={(e) => {
        const opt = options.find((o) => o.id === e.target.value);
        if (opt) onChange(opt.id, opt);
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
