export const calculateProfileStrength = (userData) => {
    if (!userData) {
        return { percentage: 0, label: 'Weak', color: 'text-red-500', barColor: 'bg-red-500' };
    }

    const fields = [
        userData.photoURL,
        userData.name,
        userData.phone || userData.mobile,
        userData.businessName, // We'll count this separately from name
        userData.address,
        userData.category,
        userData.type,
        userData.gstin,
        userData.bankAccount,
        userData.upiId,
        userData.staffDetails
    ];

    const filledFields = fields.filter(f => f && f.toString().trim() !== '').length;
    const percentage = Math.round((filledFields / fields.length) * 100);

    let label = 'Weak';
    let color = 'text-red-500';
    let barColor = 'bg-red-500';

    if (percentage > 70) {
        label = 'Strong';
        color = 'text-green-600';
        barColor = 'bg-green-500';
    } else if (percentage > 30) {
        label = 'Good';
        color = 'text-yellow-600';
        barColor = 'bg-yellow-500';
    }

    return { percentage, label, color, barColor };
};
