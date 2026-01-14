import type { Appearance } from '@clerk/types';

/**
 * Clerk appearance configuration that matches the platform's design system.
 *
 * Design system references:
 * - Font: DM Sans (--font-sans)
 * - Primary: neutral-900 / neutral-50
 * - Borders: neutral-200
 * - Border radius: 0.625rem (--radius)
 * - Inputs: border border-neutral-200 bg-neutral-50
 */
export const clerkAppearance: Appearance = {
  variables: {
    // Typography - match DM Sans
    fontFamily:
      '"DM Sans Variable", "DM Sans", ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons:
      '"DM Sans Variable", "DM Sans", ui-sans-serif, system-ui, sans-serif',

    // Border radius - match --radius (0.625rem = 10px)
    borderRadius: '0.625rem',

    // Colors - match neutral palette
    colorPrimary: 'oklch(0.21 0.006 285.885)', // neutral-900
    colorText: 'oklch(0.141 0.005 285.823)', // neutral-950
    colorTextSecondary: 'oklch(0.442 0.017 285.786)', // neutral-600
    colorBackground: '#ffffff',
    colorInputBackground: 'oklch(0.985 0 0)', // neutral-50
    colorInputText: 'oklch(0.141 0.005 285.823)', // neutral-950

    // Danger/destructive
    colorDanger: 'oklch(0.577 0.245 27.325)', // negative-600

    // Spacing
    spacingUnit: '1rem',
  },
  elements: {
    // Root card styling - match border-card pattern
    card: {
      boxShadow: 'none',
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      borderRadius: '0.625rem',
    },
    rootBox: {
      width: '100%',
    },

    // Header styling
    headerTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: 'oklch(0.141 0.005 285.823)', // neutral-950
    },
    headerSubtitle: {
      fontSize: '0.875rem',
      color: 'oklch(0.442 0.017 285.786)', // neutral-600
    },

    // Form fields - match border-input pattern
    formFieldInput: {
      borderRadius: '0.5rem',
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      backgroundColor: 'oklch(0.985 0 0)', // neutral-50
      fontSize: '0.875rem',
      height: '2.5rem',
      padding: '0 0.75rem',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      '&:focus': {
        borderColor: 'oklch(0.871 0.006 286.286)', // neutral-300
        boxShadow: '0 0 0 3px oklch(0.871 0.006 286.286 / 0.5)', // ring effect
        outline: 'none',
      },
    },
    formFieldLabel: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: 'oklch(0.141 0.005 285.823)', // neutral-950
      marginBottom: '0.375rem',
    },
    formFieldInputShowPasswordButton: {
      color: 'oklch(0.552 0.016 285.938)', // neutral-500
      '&:hover': {
        color: 'oklch(0.37 0.013 285.805)', // neutral-700
      },
    },

    // Primary button - match default button variant
    formButtonPrimary: {
      backgroundColor: 'oklch(0.21 0.006 285.885)', // neutral-900
      color: 'oklch(0.985 0 0)', // neutral-50
      fontSize: '0.875rem',
      fontWeight: '500',
      height: '2.25rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.1)',
      transition: 'background-color 0.15s',
      '&:hover': {
        backgroundColor: 'oklch(0.274 0.006 286.033)', // neutral-800
      },
      '&:focus': {
        boxShadow:
          '0 0 0 3px oklch(0.871 0.006 286.286 / 0.5), 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    },

    // Social buttons - match secondary button variant
    socialButtonsBlockButton: {
      backgroundColor: '#ffffff',
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      color: 'oklch(0.21 0.006 285.885)', // neutral-900
      fontSize: '0.875rem',
      fontWeight: '500',
      height: '2.25rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      transition: 'background-color 0.15s, border-color 0.15s',
      '&:hover': {
        backgroundColor: 'oklch(0.967 0.001 286.375)', // neutral-100
        borderColor: 'oklch(0.871 0.006 286.286)', // neutral-300
      },
    },
    socialButtonsBlockButtonText: {
      fontWeight: '500',
    },

    // Divider
    dividerLine: {
      backgroundColor: 'oklch(0.92 0.004 286.32)', // neutral-200
    },
    dividerText: {
      color: 'oklch(0.552 0.016 285.938)', // neutral-500
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },

    // Footer links
    footerActionLink: {
      color: 'oklch(0.369 0.144 260.2)', // brand-500
      fontWeight: '500',
      '&:hover': {
        color: 'oklch(0.32 0.13 260)', // brand-600
        textDecoration: 'underline',
      },
    },
    footerActionText: {
      color: 'oklch(0.552 0.016 285.938)', // neutral-500
    },

    // Identifier preview (email badge)
    identityPreview: {
      backgroundColor: 'oklch(0.985 0 0)', // neutral-50
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      borderRadius: '0.5rem',
    },
    identityPreviewText: {
      color: 'oklch(0.37 0.013 285.805)', // neutral-700
    },
    identityPreviewEditButton: {
      color: 'oklch(0.369 0.144 260.2)', // brand-500
      '&:hover': {
        color: 'oklch(0.32 0.13 260)', // brand-600
      },
    },

    // OTP input
    otpCodeFieldInput: {
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      borderRadius: '0.5rem',
      backgroundColor: 'oklch(0.985 0 0)', // neutral-50
      '&:focus': {
        borderColor: 'oklch(0.871 0.006 286.286)', // neutral-300
        boxShadow: '0 0 0 3px oklch(0.871 0.006 286.286 / 0.5)',
      },
    },

    // Alert/error styling
    alert: {
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
    },
    alertText: {
      fontSize: '0.875rem',
    },

    // Internal buttons (like "Resend code")
    formResendCodeLink: {
      color: 'oklch(0.369 0.144 260.2)', // brand-500
      fontWeight: '500',
      '&:hover': {
        color: 'oklch(0.32 0.13 260)', // brand-600
      },
    },

    // Alternative methods
    alternativeMethodsBlockButton: {
      backgroundColor: 'transparent',
      border: '1px solid oklch(0.92 0.004 286.32)', // neutral-200
      color: 'oklch(0.37 0.013 285.805)', // neutral-700
      fontSize: '0.875rem',
      borderRadius: '0.5rem',
      '&:hover': {
        backgroundColor: 'oklch(0.985 0 0)', // neutral-50
        borderColor: 'oklch(0.871 0.006 286.286)', // neutral-300
      },
    },

    // User button (avatar dropdown)
    userButtonAvatarBox: {
      width: '2rem',
      height: '2rem',
    },
    userButtonTrigger: {
      borderRadius: '9999px',
      '&:focus': {
        boxShadow: '0 0 0 3px oklch(0.871 0.006 286.286 / 0.5)',
      },
    },

    // Back button / navigation
    formHeaderTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
    },
    backButton: {
      color: 'oklch(0.552 0.016 285.938)', // neutral-500
      '&:hover': {
        color: 'oklch(0.37 0.013 285.805)', // neutral-700
      },
    },
  },
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false,
    shimmer: true,
  },
};
