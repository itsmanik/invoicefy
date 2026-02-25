/**
 * Validates business registration form data.
 * Returns an object of field-level errors (empty object = no errors).
 */
export const validateBusinessRegistration = ({ name, gstNumber, address, email, phone }) => {
    const errors = {};

    // Business name
    if (!name || name.trim().length < 2) {
        errors.name = 'Business name must be at least 2 characters.';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address.';
    }

    // Phone — allow 10-digit Indian mobile or landline numbers
    const phoneRegex = /^[6-9]\d{9}$|^\+91[6-9]\d{9}$|^\d{6,12}$/;
    if (!phone || !phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        errors.phone = 'Please enter a valid phone number.';
    }

    // GST number — Indian GST format: 2 digits + 10-char PAN + 1 digit + Z + 1 char
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (gstNumber && !gstRegex.test(gstNumber.toUpperCase())) {
        errors.gstNumber = 'Please enter a valid GST number (e.g. 27AAPFU0939F1ZV).';
    }

    // Address
    if (!address || address.trim().length < 5) {
        errors.address = 'Please enter a complete business address.';
    }

    return errors;
};

/**
 * Validates a single email address.
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates that a password meets minimum requirements.
 */
export const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters.');
    }
    return errors;
};
