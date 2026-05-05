import React from 'react';
import { dbService } from '../services/firebase';

const EntryDetailsDrawer = ({ isOpen, onClose, transaction, customerName, onDeleteSuccess, onEdit }) => {
    if (!isOpen || !transaction) return null;

    const isGave = transaction.amount < 0 || transaction.type === 'GAVE' || transaction.type === 'credit';
    const absAmount = Math.abs(transaction.amount);
    
    // Format date like: 10 Apr 26 • 06:54 PM
    const txDate = transaction.timestamp ? new Date(transaction.timestamp) : (transaction.date ? new Date(transaction.date) : null);
    const formattedDate = txDate ? (() => {
        const d = txDate;
        const day = d.getDate().toString().padStart(2, '0');
        const mon = d.toLocaleString('en-IN', { month: 'short' });
        const yr = d.getFullYear().toString().slice(-2);
        let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        return `${day} ${mon} ${yr} • ${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    })() : 'N/A';

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            try {
                await dbService.deleteTransaction(transaction.customerId, transaction.id, transaction.amount);
                onClose();
                if (onDeleteSuccess) onDeleteSuccess();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col md:justify-end md:flex-row bg-black/40" style={{ fontFamily: "'Roboto', sans-serif" }}>
            {/* Backdrop */}
            <div className="hidden md:block absolute inset-0" onClick={onClose} />

            {/* Drawer panel */}
            <div className="relative w-full h-full md:max-w-[400px] bg-[#EEEEEE] shadow-2xl flex flex-col md:slide-in-right animate-in slide-in-from-bottom duration-300">
                
                {/* Header (Blue) */}
                <div className="bg-[#0b5cba] text-white flex items-center px-4 h-14 shrink-0 shadow-sm z-10 relative">
                    <button onClick={onClose} className="p-2 -ml-2 mr-2 active:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-[19px] font-medium tracking-wide">Entry Details</h2>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`
                        .flex-1::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {/* Blue Background Extension */}
                    <div className="bg-[#0b5cba] h-[180px] absolute top-14 left-0 right-0 z-0"></div>

                    {/* Main Details Card */}
                    <div className="relative z-10 mx-3 mt-3 bg-white rounded-md shadow-sm overflow-hidden border border-gray-200/50">
                        
                        {/* Card Header (Profile, Name, Amount, Date) */}
                        <div className="p-4 flex justify-between items-start">
                            <div className="flex gap-3">
                                {/* Profile Avatar */}
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg border border-gray-100 shrink-0">
                                    {customerName?.[0]?.toUpperCase() || 'C'}
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-[15px] font-medium text-gray-900 leading-tight">{customerName}</h3>
                                    <p className="text-[12px] text-gray-500 mt-1">{formattedDate}</p>
                                </div>
                            </div>
                            <div className="text-right pt-0.5">
                                <p className={`text-[17px] font-bold ${isGave ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                                    <span className="mr-0.5">₹</span>{absAmount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[12px] text-gray-500 mt-0.5">{isGave ? 'You gave' : 'You got'}</p>
                            </div>
                        </div>

                        {/* Details (Description) */}
                        <div className="px-4 py-3 border-t border-gray-100 min-h-[70px]">
                            <p className="text-[11px] text-gray-500 mb-1">Details</p>
                            <p className="text-[14px] text-gray-900 break-words">{transaction.description || '-'}</p>
                        </div>

                        {/* Attachments Section (If any) */}
                        {transaction.attachment && (
                            <div className="px-4 py-3 border-t border-gray-100">
                                <p className="text-[11px] text-gray-500 mb-2">Attachment</p>
                                <img 
                                    src={transaction.attachment} 
                                    alt="Bill" 
                                    className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer"
                                    onClick={() => window.open(transaction.attachment, '_blank')}
                                />
                            </div>
                        )}

                        {/* Running Balance */}
                        <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-[#fafafa]">
                            <p className="text-[13px] text-gray-800">Running Balance</p>
                            <p className={`text-[14px] font-bold ${(transaction.balance || 0) < 0 ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                                ₹ {Math.abs(transaction.balance || 0).toLocaleString('en-IN')}
                            </p>
                        </div>

                        {/* Edit Entry Button */}
                        <div className="border-t border-gray-100">
                            <button 
                                onClick={() => onEdit(transaction)}
                                className="w-full py-3.5 flex items-center justify-center gap-2 text-[#0b5cba] font-medium text-[13px] tracking-wide hover:bg-blue-50 active:bg-blue-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                EDIT ENTRY
                            </button>
                        </div>
                    </div>

                    {/* Send Reminders */}
                    <div className="mx-3 mt-3 mb-4">
                        <div className="grid grid-cols-3 gap-2">
                            {/* Send SMS */}
                            <button 
                                onClick={() => { if(transaction.phone) window.location.href = `sms:+91${transaction.phone}?body=Entry Details: ${window.location.origin}/customer/share/${transaction.customerId}`; }}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-blue-600"
                            >
                                <span className="material-symbols-outlined text-[22px]">sms</span>
                                <span className="text-[11px] font-medium text-gray-700">Send SMS</span>
                            </button>
                            
                            {/* Send WhatsApp */}
                            <button 
                                onClick={() => { if(transaction.phone) window.open(`https://wa.me/91${transaction.phone}?text=Entry Details: ${window.location.origin}/customer/share/${transaction.customerId}`, '_blank'); }}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-[#25D366]"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                </svg>
                                <span className="text-[11px] font-medium text-gray-700">Send Whatsapp</span>
                            </button>

                            {/* Send Mail */}
                            <button 
                                onClick={() => { if(transaction.email) window.location.href = `mailto:${transaction.email}?subject=HisabKhata Entry Details&body=Entry Details: ${window.location.origin}/customer/share/${transaction.customerId}`; }}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-red-500"
                            >
                                <span className="material-symbols-outlined text-[22px]">mail</span>
                                <span className="text-[11px] font-medium text-gray-700">Send Mail</span>
                            </button>
                        </div>
                        
                        {/* Message Preview Context */}
                        <div className="mt-3 p-4 bg-white rounded-md shadow-sm border border-gray-200/50 text-[13px] text-gray-600 space-y-1">
                            <p>You {isGave ? 'gave' : 'got'}: ₹ {absAmount.toLocaleString('en-IN')}</p>
                            <p>Balance: {transaction.balance < 0 ? '-' : ''}(₹ {Math.abs(transaction.balance || 0).toLocaleString('en-IN')})</p>
                            <p>Sent by: HisabKhata Service</p>
                            <p className="mt-3 text-gray-500 break-all">Details: {window.location.origin}/customer/share/{transaction.customerId}</p>
                        </div>
                    </div>

                    {/* Backup Status */}
                    <div className="mx-3 mb-6 bg-white rounded-md shadow-sm border border-gray-200/50 p-3 flex items-center gap-3 text-gray-500">
                        <span className="material-symbols-outlined text-[20px]">cloud_done</span>
                        <span className="text-[13px]">Entry is backed up</span>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex justify-center items-center gap-2 mb-8 text-[#43a047]">
                        <span className="material-symbols-outlined text-[28px] font-light">verified_user</span>
                        <span className="text-[13px] font-medium tracking-wide">100% Safe and Secure</span>
                    </div>
                </div>

                {/* Footer Fixed Buttons */}
                <div className="flex gap-3 px-3 py-3 bg-white border-t border-gray-200">
                    <button 
                        onClick={handleDelete}
                        className="flex-1 py-2.5 border border-[#e53935] text-[#e53935] rounded font-medium text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-red-50 active:bg-red-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        DELETE
                    </button>
                    <button 
                        className="flex-[1.5] py-2.5 bg-[#0b5cba] text-white rounded font-medium text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">share</span>
                        SHARE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntryDetailsDrawer;
