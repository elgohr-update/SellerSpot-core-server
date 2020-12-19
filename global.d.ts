declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ENV: 'development' | 'production';
            PORT?: string;
            PWD: string;
            APP_NAME?: string;
            APP_VERSION?: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
