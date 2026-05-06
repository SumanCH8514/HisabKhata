import React from 'react';
import { dbService } from '../services/firebase';

const EntryDetailsDrawer = ({ isOpen, onClose, transaction, customerName, customerPhone, customerEmail, userData, onDeleteSuccess, onEdit, onViewImage }) => {
    // Local state to keep transaction data during closing animation
    const [displayTx, setDisplayTx] = React.useState(null);
    const [shouldRender, setShouldRender] = React.useState(false);

    React.useEffect(() => {
        if (isOpen && transaction) {
            setDisplayTx(transaction);
            setShouldRender(true);
        } else if (!isOpen) {
            const timer = setTimeout(() => {
                setShouldRender(false);
                setDisplayTx(null);
            }, 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen, transaction]);

    if (!shouldRender && !isOpen) return null;

    const tx = displayTx || transaction;
    if (!tx) return null;

    const isGave = tx.amount < 0 || tx.type === 'GAVE' || tx.type === 'credit';
    const absAmount = Math.abs(tx.amount);
    
    // Format date like: 05 May 26 • 10:23 PM
    const txDate = tx.timestamp ? new Date(tx.timestamp) : (tx.date ? new Date(tx.date) : null);
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
                await dbService.deleteTransaction(tx.customerId, tx.id, tx.amount);
                onClose();
                if (onDeleteSuccess) onDeleteSuccess();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    };

    const handleShare = async () => {
        const businessName = userData?.businessName || userData?.name || 'HisabKhata User';
        const businessPhone = userData?.phone || '';
        const action = isGave ? 'requested a payment of' : 'recorded a payment of';
        const shareUrl = `${window.location.origin}/customer/share/${tx.customerId}`;
        const msg = `${businessName} (${businessPhone}) has ${action} ₹ ${absAmount.toLocaleString('en-IN')} on HisabKhata. Please visit ${shareUrl} to view details. If the link is not clickable, please save this contact and try again.`;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#EEEEEE';
            ctx.lineWidth = 10;
            ctx.strokeRect(40, 40, 920, 920);

            ctx.fillStyle = '#666666';
            ctx.font = '500 45px Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Payment reminder for', 500, 180);

            ctx.fillStyle = isGave ? '#e53935' : '#43a047';
            ctx.font = 'bold 160px Roboto, sans-serif';
            ctx.fillText(`₹ ${absAmount.toLocaleString('en-IN')}`, 500, 380);

            ctx.fillStyle = '#888888';
            ctx.font = '40px Roboto, sans-serif';
            ctx.fillText(`on ${formattedDate.split(' • ')[0]}`, 500, 480);

            ctx.strokeStyle = '#EEEEEE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(150, 600);
            ctx.lineTo(850, 600);
            ctx.stroke();

            ctx.fillStyle = '#333333';
            ctx.font = 'bold 50px Roboto, sans-serif';
            ctx.fillText(`Sent by ${businessName}`, 500, 720);

            ctx.fillStyle = '#777777';
            ctx.font = '40px Roboto, sans-serif';
            ctx.fillText(`${userData?.name || ''} | ${businessPhone}`, 500, 800);

            ctx.fillStyle = '#0b5cba';
            ctx.font = 'bold 55px Roboto, sans-serif';
            ctx.fillText('HisabKhata Service', 500, 920);

            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'reminder.png', { type: 'image/png' });
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Payment Reminder', text: msg });
                } else if (navigator.share) {
                    await navigator.share({ title: 'Payment Reminder', text: msg, url: shareUrl });
                } else {
                    navigator.clipboard.writeText(msg);
                    alert('Reminder text copied to clipboard!');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Share failed:', err);
            navigator.clipboard.writeText(msg);
            alert('Reminder text copied to clipboard!');
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-[110] flex flex-col md:justify-end md:flex-row transition-all duration-300 ${isOpen ? 'bg-black/40 visible' : 'bg-transparent invisible'}`} 
            style={{ fontFamily: "'Roboto', sans-serif" }}
        >
            <div className="hidden md:block absolute inset-0" onClick={onClose} />

            <div className={`relative w-full h-full md:max-w-[400px] bg-[#EEEEEE] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}>
                
                {/* Header */}
                <div className="bg-[#0b5cba] text-white flex items-center px-4 h-14 shrink-0 shadow-sm z-10 relative">
                    <button onClick={onClose} className="p-2 -ml-2 mr-2 active:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-[19px] font-medium tracking-wide">Entry Details</h2>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.flex-1::-webkit-scrollbar { display: none; }`}</style>
                    <div className="bg-[#0b5cba] h-[160px] absolute top-14 left-0 right-0 z-0"></div>

                    {/* Entry Info Card */}
                    <div className="relative z-10 mx-3 mt-3 bg-white rounded-md shadow-sm overflow-hidden border border-gray-200/50">
                        <div className="p-4 flex justify-between items-start">
                            <div className="flex gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl border border-gray-100 shrink-0">
                                    {customerName?.[0]?.toUpperCase() || 'C'}
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-[16px] font-medium text-gray-900 leading-tight">{customerName}</h3>
                                    <p className="text-[13px] text-gray-500 mt-1">{formattedDate}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-[18px] font-bold ${isGave ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                                    ₹ {absAmount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[13px] text-gray-500">{isGave ? 'You gave' : 'You got'}</p>
                            </div>
                        </div>

                        {tx.description && (
                            <div className="px-4 pb-4">
                                <p className="text-[14px] text-gray-600 leading-relaxed italic">{tx.description}</p>
                            </div>
                        )}

                        {tx.attachment && (
                            <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
                                <img src={tx.attachment} alt="Bill" className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer" onClick={() => onViewImage ? onViewImage(tx.attachment) : window.open(tx.attachment, '_blank')} />
                            </div>
                        )}

                        <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center bg-[#fafafa]">
                            <p className="text-[14px] text-gray-700">Running Balance</p>
                            <p className={`text-[15px] font-bold ${(tx.balance || 0) < 0 ? 'text-[#e53935]' : 'text-[#43a047]'}`}>
                                ₹ {Math.abs(tx.balance || 0).toLocaleString('en-IN')}
                            </p>
                        </div>

                        <div className="border-t border-gray-100">
                            <button onClick={() => onEdit(tx)} className="w-full py-3.5 flex items-center justify-center gap-2 text-[#0b5cba] font-medium text-[14px] tracking-wide hover:bg-blue-50">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                EDIT ENTRY
                            </button>
                        </div>
                    </div>

                    {/* Reminder Buttons Grid */}
                    <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
                        <button onClick={() => { if(customerPhone) { const msg = `${userData?.businessName || 'HisabKhata User'} has requested ₹${absAmount} on HisabKhata. Details: ${window.location.origin}/customer/share/${tx.customerId}`; window.location.href = `sms:${customerPhone}?body=${encodeURIComponent(msg)}`; } else alert("No phone number"); }} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 text-blue-600">
                            <span className="material-symbols-outlined text-[24px]">sms</span>
                            <span className="text-[11px] font-medium text-gray-700">Send SMS</span>
                        </button>
                        <button onClick={() => { if(customerPhone) { const msg = `${userData?.businessName || 'HisabKhata User'} (${userData?.phone || ''}) has requested a payment of ₹ ${absAmount.toLocaleString('en-IN')} on HisabKhata. Please visit ${window.location.origin}/customer/share/${tx.customerId} to view details. If the link is not clickable, please save this contact and try again.`; window.open(`https://wa.me/${customerPhone.includes('+') ? customerPhone : '91'+customerPhone}?text=${encodeURIComponent(msg)}`, '_blank'); } else alert("No phone number"); }} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 text-[#25D366]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                            <span className="text-[11px] font-medium text-gray-700">Send Whatsapp</span>
                        </button>
                        <button 
                            onClick={async () => { 
                                if(customerEmail) { 
                                    const businessName = userData?.businessName || userData?.name || 'HisabKhata User';
                                    const businessPhone = userData?.phone || '';
                                    const action = isGave ? 'requested a payment of' : 'recorded a payment of';
                                    const msg = `${businessName} (${businessPhone}) has ${action} ₹ ${absAmount.toLocaleString('en-IN')} on HisabKhata. Please visit ${window.location.origin}/customer/share/${tx.customerId} to view details.`;
                                    
                                    try {
                                        await dbService.sendEmailNotification({
                                            to_email: customerEmail,
                                            to_name: customerName,
                                            subject: `Payment Reminder - ${businessName}`,
                                            message: msg,
                                            type: 'REMINDER'
                                        });
                                        alert('Email sent successfully! ✅');
                                    } catch (err) {
                                        // Fallback to mailto
                                        window.location.href = `mailto:${customerEmail}?subject=Payment Reminder&body=${encodeURIComponent(msg)}`;
                                    }
                                } else alert("No email"); 
                            }} 
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-md shadow-sm border border-gray-200/50 text-red-500"
                        >
                            <span className="material-symbols-outlined text-[24px]">mail</span>
                            <span className="text-[11px] font-medium text-gray-700">Send Mail</span>
                        </button>
                    </div>

                    {/* Message Preview */}
                    <div className="mx-3 mt-3 p-4 bg-white rounded-md shadow-sm border border-gray-200/50 space-y-1">
                        <p className="text-[14px] text-gray-700">You {isGave ? 'gave' : 'got'}: ₹ {absAmount.toLocaleString('en-IN')}</p>
                        <p className="text-[14px] text-gray-700">Balance: {tx.balance < 0 ? '-' : ''}(₹ {Math.abs(tx.balance || 0).toLocaleString('en-IN')})</p>
                        <p className="text-[14px] text-gray-700">Sent by: HisabKhata Service</p>
                        <p className="text-[13px] text-gray-500 break-all leading-tight pt-1">Details: {window.location.origin}/customer/share/{tx.customerId}</p>
                    </div>

                    {/* Backup Status */}
                    <div className="mx-3 mt-3 bg-white rounded-md shadow-sm border border-gray-200/50 p-3.5 flex items-center gap-3 text-gray-500">
                        <span className="material-symbols-outlined text-[22px]">cloud_done</span>
                        <span className="text-[14px]">Entry is backed up</span>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex justify-center items-center gap-2 my-6 text-[#43a047]">
                        <span className="material-symbols-outlined text-[28px] font-light">verified_user</span>
                        <span className="text-[14px] font-medium tracking-wide">100% Safe and Secure</span>
                    </div>
                </div>

                {/* Footer Fixed Buttons */}
                <div className="flex gap-3 px-3 py-3 bg-white border-t border-gray-100">
                    <button onClick={handleDelete} className="flex-1 py-2.5 border border-[#e53935] text-[#e53935] rounded font-bold text-[13px] flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        DELETE
                    </button>
                    <button onClick={handleShare} className="flex-[1.5] py-2.5 bg-[#0b5cba] text-white rounded font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">share</span>
                        SHARE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntryDetailsDrawer;
