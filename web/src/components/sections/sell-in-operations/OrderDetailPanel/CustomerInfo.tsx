/**
 * CustomerInfo
 * ============
 * Shows customer name, tax ID (NIF/CIF), and fiscal address.
 */

interface CustomerInfoProps {
  customerName: string
  customerId: string
  customerTaxId?: string
  customerAddress?: string
}

export function CustomerInfo({
  customerName,
  customerId,
  customerTaxId,
  customerAddress,
}: CustomerInfoProps) {
  return (
    <div className="p-3 bg-[#F5F4F2] rounded-sm">
      <p className="font-medium text-[#44403C]">{customerName}</p>
      <p className="text-xs text-[#78716C] font-mono">ID: {customerId}</p>
      {customerTaxId && (
        <p className="text-xs text-[#78716C] font-mono mt-1">NIF/CIF: {customerTaxId}</p>
      )}
      {customerAddress && (
        <p className="text-xs text-[#78716C] mt-1 whitespace-pre-line">{customerAddress}</p>
      )}
    </div>
  )
}
