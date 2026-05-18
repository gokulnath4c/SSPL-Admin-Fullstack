SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    cc.check_clause
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.check_constraints AS cc 
        ON tc.constraint_name = cc.constraint_name 
    JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
WHERE 
    tc.constraint_type = 'CHECK' 
    AND tc.table_name = 'player_registrations'
    AND kcu.column_name = 'payment_status';
