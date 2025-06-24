## File Formats

Each supplier requires a specific file format:

### Ringa

- **Format**: Pipe-delimited text file
- **Valid Lines**: Start with `D|` and contain `RINGA` in the second column
- **Example**:  
  `D|RINGA0100|100.00|0|100.00|01/06/2026|127465|RT09C1044798F43|2691290788475827`

- **Column Structure**:
  - Column 1: Line identifier (`D`)
  - Column 2: Voucher type (contains `RINGA`)
  - Column 3: Amount (e.g., `100.00`)
  - Column 4-5: Other data
  - Column 6: Expiry date (`DD/MM/YYYY`)
  - Column 7+: Additional data
  - Second Last Column: Serial Number
  - Last Column: PIN

### Hollywoodbets

- **Format**: Pipe-delimited text file
- **Valid Lines**: Start with `D|` and contain `HWB` in the second column
- **Example**:  
  `D|HWB000010|10.00|1095|10|02/05/2027|39942|1359713349|00186831686370119`

- **Column Structure**:
  - Column 1: Line identifier (`D`)
  - Column 2: Voucher type (contains `HWB`)
  - Column 3: Amount (e.g., `10.00`)
  - Column 4-5: Other data
  - Column 6: Expiry date (`DD/MM/YYYY`)
  - Column 7+: Additional data
  - Second Last Column: Serial Number
  - Last Column: PIN

### Easyload

- **Format**: Comma-delimited text file
- **Valid Lines**: Start with `Easyload`
- **Example**:  
  `Easyload,5,25357070837651,00100050000096969531,20270822`

- **Column Structure**:
  - Column 1: Voucher type (`Easyload`)
  - Column 2: Amount (e.g., `5`)
  - Column 3: Serial Number
  - Column 4: PIN
  - Last Column: Expiry date (`YYYYMMDD`)

### Unipin

- **Format**: Pipe-delimited text file
- **Valid Lines**: Start with `D|` and contain `UPN` in the second column
- **Example**:  
  `D|UPN000500|500.00|0|500.00|07/01/2025|122099|0002103221445|350040043`

- **Column Structure**:
  - Column 1: Line identifier (`D`)
  - Column 2: Voucher type (contains `UPN`)
  - Column 3: Amount (e.g., `500.00`)
  - Column 4-5: Other data
  - Column 6: Expiry date (`DD/MM/YYYY`)
  - Column 7: Additional data
  - Second Last Column: PIN (13 digits)
  - Last Column: Serial Number
