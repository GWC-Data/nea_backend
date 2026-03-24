import { User } from 'db';
import { Schema } from 'express-validator';

export const createUserValidator: Schema = {
    firstName: {
        in: 'body',
        exists: {
            errorMessage: 'First name is required',
        },
        isString: {
            errorMessage: 'First name must be a string',
        },
        isLength: {
            options: { max: 20 },
            errorMessage: 'First name must be less than 20 characters',
        }
    },
    lastName: {
        in: 'body',
        exists: {
            errorMessage: 'Last name is required',
        },
        isString: {
            errorMessage: 'Last name must be a string',
        },
        isLength: {
            options: { min: 1 },
            errorMessage: 'Last name must be at least 2 characters',
        }
    },
    email: {
        in: 'body',
        exists: {
            errorMessage: 'Email is required'
        },
        isEmail: {
            errorMessage: 'Email is not valid'
        },
        normalizeEmail: true, // Automatically normalize email
        custom: {
            options: async (value) => {
                const user = await User.findOne({ where: { email: value }, raw: true });
                if (user) {
                    throw new Error('Email already in use');
                }
            }
        }
    },
    phoneNumber: {
        in: 'body',
        exists: {
            errorMessage: 'Phone number is required'
        }
    },
    dateOfBirth: {
        in: 'body',
        exists: {
            errorMessage: 'Date of birth is required'
        },
        isDate: {
            errorMessage: 'Date of birth must be a valid date'
        }
    },
    password: {
        in: 'body',
        exists: {
            errorMessage: 'Password is required'
        },
        isLength: {
            options: { min: 8, max: 20 },
            errorMessage: 'Password must be between 8 and 20 characters long',
        }
        // matches: {
        //     options: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        //     errorMessage:
        //         'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        // },
    },
    roleId: {
        in: 'body',
        exists: {
            errorMessage: 'Role is required'
        },
        isInt: {
            errorMessage: 'Role must be an integer'
        }
    }
};

export const updateUserValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'User id is required'
        },
        isInt: {
            errorMessage: 'User id must be an integer'
        }
    },
    firstName: {
        in: 'body',
        exists: {
            errorMessage: 'First name is required',
        },
        isString: {
            errorMessage: 'First name must be a string',
        },
        isLength: {
            options: { max: 20 },
            errorMessage: 'First name must be less than 20 characters',
        }
    },
    lastName: {
        in: 'body',
        exists: {
            errorMessage: 'Last name is required',
        },
        isString: {
            errorMessage: 'Last name must be a string',
        },
        isLength: {
            options: { min: 1 },
            errorMessage: 'Last name must be at least 2 characters',
        }
    },
    email: {
        in: 'body',
        exists: {
            errorMessage: 'Email is required'
        },
        isEmail: {
            errorMessage: 'Email is not valid'
        },
        normalizeEmail: true, // Automatically normalize email
        custom: {
            options: async (value) => {
                const user = await User.findOne({ where: { email: value }, raw: true });
                if (user) {
                    throw new Error('Email already in use');
                }
            }
        }
    },
    dateOfBirth: {
        in: 'body',
        exists: {
            errorMessage: 'Date of birth is required'
        },
        isDate: {
            errorMessage: 'Date of birth must be a valid date'
        }
    },
    phoneNumber: {
        in: 'body',
        exists: {
            errorMessage: 'Phone number is required'
        }
    },
    roleId: {
        in: 'body',
        exists: {
            errorMessage: 'Role is required'
        },
        isInt: {
            errorMessage: 'Role must be an integer'
        }
    },
    accountStatus: {
        in: 'body',
        exists: {
            errorMessage: 'Account status is required'
        },
        isString: {
            errorMessage: 'Account status must be a string'
        },
    }
};


export const deleteUserValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'User id is required'
        },
        isInt: {
            errorMessage: 'User id must be an integer'
        }
    }
};